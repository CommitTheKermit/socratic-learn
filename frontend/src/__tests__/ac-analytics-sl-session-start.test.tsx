/**
 * Sub-AC 2a: learn 단계 진입 시 sl_session_start 계측 검증
 *
 * - App 을 learn URL 로 직접 렌더해 logEvent("sl_session_start", ...) 호출 여부 검증
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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 2a: sl_session_start 계측", () => {
  test("learn 단계 진입 시 sl_session_start 가 concept/mode 파라미터로 호출됨", async () => {
    const sessionId = "s-test-abc";
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
        stepIdx: 0,
        answers: {},
        skips: {},
      }),
    );

    renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_session_start", {
        session_id: sessionId,
        concept: "TypeScript 기초",
        mode: "socratic",
      });
    });
  });

  test("mode=light 세션 learn 진입 시 mode 파라미터가 정확히 전달됨", async () => {
    const sessionId = "s-test-light";
    localStorage.setItem(
      sessionKey(sessionId),
      JSON.stringify({
        sessionId,
        createdAt: 2000,
        conceptSummary: "React Hooks",
        stage: "learn",
        mode: "light",
        concept: "React Hooks",
        materials: "",
        probes: {},
        estimatedLevel: 1,
        stepIdx: 0,
        answers: {},
        skips: {},
      }),
    );

    renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_session_start", {
        session_id: sessionId,
        concept: "React Hooks",
        mode: "light",
      });
    });
  });

  test("probe 단계 렌더 시 sl_session_start 가 호출되지 않음", async () => {
    const sessionId = "s-test-probe";
    localStorage.setItem(
      sessionKey(sessionId),
      JSON.stringify({
        sessionId,
        createdAt: 3000,
        conceptSummary: "Vue 기초",
        stage: "probe",
        mode: "socratic",
        concept: "Vue 기초",
        materials: "",
        probes: {},
        estimatedLevel: null,
        stepIdx: 0,
        answers: {},
        skips: {},
      }),
    );

    renderApp([`/s/${sessionId}/probe`]);

    // 100ms 대기 후에도 호출 없어야 함
    await new Promise((r) => setTimeout(r, 100));
    expect(analytics.logEvent).not.toHaveBeenCalledWith(
      "sl_session_start",
      expect.anything(),
    );
  });
});
