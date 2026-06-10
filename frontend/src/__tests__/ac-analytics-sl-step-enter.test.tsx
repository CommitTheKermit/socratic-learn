/**
 * Sub-AC 3a: 스텝 마운트/이동 시 sl_step_enter 계측 검증
 *
 * - App 을 learn URL 로 렌더해 logEvent("sl_step_enter", ...) 호출 여부 검증
 * - analytics 모듈은 vitest.setup.ts 의 전역 vi.mock 으로 no-op 대체됨
 *   (컴포넌트가 GA4 전송 없이 올바른 파라미터로 logEvent 를 호출하는지만 검사)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
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
  generateRoadmapOutline: vi.fn(async () => [
    { title: "단계 1", desc: "설명 1" },
    { title: "단계 2", desc: "설명 2" },
  ]),
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

/** 공통 세션 스냅샷 시드 */
function seedLearnSession(sessionId: string, stepIdx = 0) {
  localStorage.setItem(
    sessionKey(sessionId),
    JSON.stringify({
      sessionId,
      createdAt: 1000,
      conceptSummary: "TypeScript 기초",
      stage: "learn",
      mode: "socratic",
      concept: "TypeScript 기초",
      materials: "",
      probes: {},
      estimatedLevel: 2,
      stepIdx,
      answers: {},
      skips: {},
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 3a: sl_step_enter 계측", () => {
  test("learn/0 진입 시 sl_step_enter(step_idx: 0)가 sessionId 와 함께 호출됨", async () => {
    const sessionId = "s-step-enter-0";
    seedLearnSession(sessionId, 0);

    renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_step_enter", {
        session_id: sessionId,
        step_idx: 0,
      });
    });
  });

  test("learn/2 진입 시 sl_step_enter(step_idx: 2)가 호출됨", async () => {
    const sessionId = "s-step-enter-2";
    seedLearnSession(sessionId, 2);

    renderApp([`/s/${sessionId}/learn/2`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_step_enter", {
        session_id: sessionId,
        step_idx: 2,
      });
    });
  });

  test("probe 단계에서는 sl_step_enter 가 호출되지 않음", async () => {
    const sessionId = "s-step-enter-probe";
    localStorage.setItem(
      sessionKey(sessionId),
      JSON.stringify({
        sessionId,
        createdAt: 1000,
        conceptSummary: "TypeScript 기초",
        stage: "probe",
        mode: "socratic",
        concept: "TypeScript 기초",
        materials: "",
        probes: {},
        estimatedLevel: null,
        stepIdx: 0,
        answers: {},
        skips: {},
      }),
    );

    renderApp([`/s/${sessionId}/probe`]);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(analytics.logEvent).not.toHaveBeenCalledWith(
      "sl_step_enter",
      expect.anything(),
    );
  });

  test("sl_step_enter 파라미터는 환경 분기 없이 순수 도메인 값만 포함함", async () => {
    const sessionId = "s-step-enter-params";
    seedLearnSession(sessionId, 0);

    renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => {
      const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
      const stepEnterCall = calls.find(([name]) => name === "sl_step_enter");
      expect(stepEnterCall).toBeDefined();
      // 파라미터가 순수 도메인 값(session_id, step_idx)만 포함함
      expect(stepEnterCall?.[1]).toEqual({
        session_id: sessionId,
        step_idx: 0,
      });
    });
  });
});
