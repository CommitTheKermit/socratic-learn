/**
 * Sub-AC 2b: currentStage 변경 시 sl_stage_enter 호출 계측 검증
 *
 * - 각 단계 URL 로 App 을 렌더해 logEvent("sl_stage_enter", ...) 호출 여부 검증
 * - analytics 모듈은 vitest.setup.ts 의 전역 vi.mock 으로 no-op 대체됨
 *   (컴포넌트가 실제 GA4 전송 없이 올바른 파라미터로 logEvent 를 호출하는지만 검사)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as analytics from "../lib/analytics";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

// 학습 콘텐츠 로드(네트워크/Claude)를 stub 해 격리한다.
vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  generateProbeQuestions: vi.fn(async () => []),
  generateRoadmapOutline: vi.fn(async () => [{ title: "단계 1", desc: "설명 1" }]),
  generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({})),
}));

// 원격 세션 API stub
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

function renderApp(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

/** 공통 세션 스냅샷 팩토리 */
function seedSession(sessionId: string, stage: string, extra: Record<string, unknown> = {}) {
  localStorage.setItem(
    sessionKey(sessionId),
    JSON.stringify({
      sessionId,
      createdAt: 1000,
      conceptSummary: "TypeScript 기초",
      stage,
      mode: "socratic",
      concept: "TypeScript 기초",
      materials: "",
      probes: {},
      estimatedLevel: 2,
      stepIdx: 0,
      answers: {},
      skips: {},
      ...extra,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 2b: sl_stage_enter 계측", () => {
  test("probe 단계 진입 시 sl_stage_enter(stage: 'probe')가 호출됨", async () => {
    const sessionId = "s-stage-probe";
    seedSession(sessionId, "probe");

    renderApp([`/s/${sessionId}/probe`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_stage_enter", {
        session_id: sessionId,
        stage: "probe",
      });
    });
  });

  test("learn 단계 진입 시 sl_stage_enter(stage: 'learn')가 호출됨", async () => {
    const sessionId = "s-stage-learn";
    seedSession(sessionId, "learn");

    renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_stage_enter", {
        session_id: sessionId,
        stage: "learn",
      });
    });
  });

  test("done 단계 진입 시 sl_stage_enter(stage: 'done')가 호출됨(완료 마커)", async () => {
    const sessionId = "s-stage-done";
    seedSession(sessionId, "done");

    renderApp([`/s/${sessionId}/done`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_stage_enter", {
        session_id: sessionId,
        stage: "done",
      });
    });
  });

  test("input 단계(세션 있음) 진입 시 sl_stage_enter(stage: 'input')가 호출됨", async () => {
    const sessionId = "s-stage-input";
    seedSession(sessionId, "input");

    renderApp([`/s/${sessionId}`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_stage_enter", {
        session_id: sessionId,
        stage: "input",
      });
    });
  });

  test("홈('/')은 sessionId 없음 - sl_stage_enter 호출 없음", async () => {
    renderApp(["/"]);

    // 100ms 대기 후에도 호출 없어야 함
    await new Promise((r) => setTimeout(r, 100));
    expect(analytics.logEvent).not.toHaveBeenCalledWith(
      "sl_stage_enter",
      expect.anything(),
    );
  });

  test("learn 단계에서 sl_session_start 와 sl_stage_enter 가 함께 호출됨", async () => {
    const sessionId = "s-stage-learn-both";
    seedSession(sessionId, "learn");

    renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_session_start", {
        session_id: sessionId,
        concept: "TypeScript 기초",
        mode: "socratic",
      });
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_stage_enter", {
        session_id: sessionId,
        stage: "learn",
      });
    });
  });

  test("sl_stage_enter 는 계측 포인트에 환경 분기 코드가 없음(래퍼만 호출)", async () => {
    // 이 테스트는 코드 구조를 검증한다:
    // - logEvent 호출 시 인자에 환경 체크 없이 순수 파라미터만 전달됨
    // - 게이팅은 래퍼(analytics.ts) 내부에서만 처리됨
    const sessionId = "s-stage-gating";
    seedSession(sessionId, "probe");

    renderApp([`/s/${sessionId}/probe`]);

    await waitFor(() => {
      const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
      const stageEnterCall = calls.find(
        ([name]) => name === "sl_stage_enter",
      );
      expect(stageEnterCall).toBeDefined();
      // 파라미터가 순수 도메인 값(session_id, stage)만 포함함
      expect(stageEnterCall?.[1]).toEqual({
        session_id: sessionId,
        stage: "probe",
      });
    });
  });
});
