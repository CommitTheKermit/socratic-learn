/**
 * AC 4: deleteSessionRemote reject 시 로컬 메타/본문 보존 + 목록 항목 유지 + console.error 정확히 1회
 *
 * 검증 항목:
 * 1. console.error spy: 정확히 1회 호출
 * 2. removeSessionMeta: 호출되지 않음 (로컬 메타 보존)
 * 3. localStorage.removeItem(sessionKey(id)): 호출되지 않음 (본문 보존)
 * 4. 세션 항목이 사이드바 목록에 그대로 남아 있음
 * 5. 다른 UI 알림(alert/toast) 없음 - window.alert spy 로 확인
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

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

// deleteSessionRemote 는 각 테스트에서 reject 로 덮어쓴다
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import * as sessionApiModule from "../api/sessionApi";
import * as sessionIndex from "../state/sessionIndex";
import { upsertSessionMeta } from "../state/sessionIndex";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

const ACTIVE_KEY = "socratic:activeSessionId";

function renderApp(entries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

function seededState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: "del-fail-1",
    createdAt: 111,
    conceptSummary: "삭제실패개념",
    stage: "input",
    depth: "2depth",
    concept: "삭제실패개념",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("AC 4: deleteSessionRemote 실패 시 로컬 보존 + console.error 1회", () => {
  test("원격 삭제 reject 시 console.error 정확히 1회, removeSessionMeta 미호출, 세션 본문 보존", async () => {
    // 1. 로컬 상태 씨드
    localStorage.setItem(ACTIVE_KEY, "del-fail-1");
    localStorage.setItem(
      sessionKey("del-fail-1"),
      JSON.stringify(seededState()),
    );
    upsertSessionMeta({
      sessionId: "del-fail-1",
      createdAt: 111,
      conceptSummary: "삭제실패개념",
      stage: "input",
    });

    // 2. deleteSessionRemote → reject
    const networkError = new Error("Network Error");
    vi.mocked(sessionApiModule.deleteSessionRemote).mockRejectedValue(networkError);

    // 3. spy 설정
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 4. 사이드바 목록에서 세션 항목 찾기
    const item = (await waitFor(() =>
      screen
        .getAllByText("삭제실패개념")
        .map((el) => el.closest(".sb-history-item"))
        .find(Boolean),
    )) as HTMLElement;

    // 5. 삭제 버튼 클릭
    await user.click(within(item).getByLabelText("세션 삭제"));

    // 6. reject 처리 완료 대기 (console.error 호출될 때까지)
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // 7. console.error 정확히 1회
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    // 8. removeSessionMeta 미호출 - 로컬 메타 보존
    expect(removeMetaSpy).not.toHaveBeenCalled();

    // 9. localStorage 본문 보존 - 세션 데이터 아직 있음
    expect(localStorage.getItem(sessionKey("del-fail-1"))).not.toBeNull();

    // 10. 메타 인덱스도 보존
    const sessions = sessionIndex.listSessions();
    expect(sessions.some((m) => m.sessionId === "del-fail-1")).toBe(true);

    // 11. 다른 UI 알림 없음
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test("원격 삭제 reject 시 세션 항목이 사이드바 목록에 그대로 유지된다", async () => {
    // 비활성 세션 하나 + 삭제 시도할 세션 하나
    localStorage.setItem(ACTIVE_KEY, "active-ok");
    localStorage.setItem(
      sessionKey("active-ok"),
      JSON.stringify({
        ...seededState(),
        sessionId: "active-ok",
        conceptSummary: "활성개념OK",
        concept: "활성개념OK",
      }),
    );
    localStorage.setItem(
      sessionKey("del-fail-2"),
      JSON.stringify({
        ...seededState(),
        sessionId: "del-fail-2",
        conceptSummary: "삭제실패항목",
        concept: "삭제실패항목",
      }),
    );
    upsertSessionMeta({
      sessionId: "active-ok",
      createdAt: 200,
      conceptSummary: "활성개념OK",
      stage: "input",
    });
    upsertSessionMeta({
      sessionId: "del-fail-2",
      createdAt: 100,
      conceptSummary: "삭제실패항목",
      stage: "input",
    });

    // deleteSessionRemote → reject (HTTP 500 시뮬레이션)
    const serverError = Object.assign(new Error("Internal Server Error"), { status: 500 });
    vi.mocked(sessionApiModule.deleteSessionRemote).mockRejectedValue(serverError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 삭제 시도할 세션 항목 찾기
    const item = (await waitFor(() =>
      screen.getByText("삭제실패항목").closest(".sb-history-item"),
    )) as HTMLElement;

    await user.click(within(item).getByLabelText("세션 삭제"));

    // console.error 1회 호출 대기
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // 항목이 사이드바에 아직 표시됨
    expect(screen.getByText("삭제실패항목")).toBeInTheDocument();

    // 활성 세션도 영향 없음
    expect(screen.getAllByText("활성개념OK").length).toBeGreaterThan(0);

    // 로컬 데이터 보존
    expect(localStorage.getItem(sessionKey("del-fail-2"))).not.toBeNull();
    const sessions = sessionIndex.listSessions();
    expect(sessions.some((m) => m.sessionId === "del-fail-2")).toBe(true);
  });

  test("4xx 응답(403) reject 도 동일하게 로컬 보존 + console.error 1회", async () => {
    localStorage.setItem(ACTIVE_KEY, "del-fail-3");
    localStorage.setItem(
      sessionKey("del-fail-3"),
      JSON.stringify({
        ...seededState(),
        sessionId: "del-fail-3",
        conceptSummary: "403삭제실패",
        concept: "403삭제실패",
      }),
    );
    upsertSessionMeta({
      sessionId: "del-fail-3",
      createdAt: 300,
      conceptSummary: "403삭제실패",
      stage: "input",
    });

    // 403 에러
    const forbiddenError = Object.assign(new Error("Forbidden"), { status: 403 });
    vi.mocked(sessionApiModule.deleteSessionRemote).mockRejectedValue(forbiddenError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = (await waitFor(() =>
      screen
        .getAllByText("403삭제실패")
        .map((el) => el.closest(".sb-history-item"))
        .find(Boolean),
    )) as HTMLElement;

    await user.click(within(item).getByLabelText("세션 삭제"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // 로컬 보존
    expect(removeMetaSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(sessionKey("del-fail-3"))).not.toBeNull();

    // 목록 항목 유지
    const sessions = sessionIndex.listSessions();
    expect(sessions.some((m) => m.sessionId === "del-fail-3")).toBe(true);

    // console.error 정확히 1회 (중복 호출 없음)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
