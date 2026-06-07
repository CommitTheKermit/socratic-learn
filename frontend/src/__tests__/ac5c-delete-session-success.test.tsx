/**
 * Sub-AC 5c: deleteSession 성공 시 로컬 상태 제거 + listSessions() 검증
 *
 * 검증 항목:
 * 1. deleteSessionRemote resolve(성공) 후 removeSessionMeta 호출
 * 2. localStorage.removeItem(sessionKey(id)) 호출
 * 3. 이후 listSessions() 결과에 삭제 항목 없음
 * 4. 비활성 세션 삭제 후 활성 세션 및 다른 항목은 listSessions() 에 그대로 유지
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

// deleteSessionRemote 성공(resolve) mock
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import * as sessionIndex from "../state/sessionIndex";
import { upsertSessionMeta, listSessions } from "../state/sessionIndex";
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

function makeSessionState(id: string, concept: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: id,
    createdAt: 100,
    conceptSummary: concept,
    stage: "input",
    depth: "2depth",
    concept,
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

describe("Sub-AC 5c: deleteSession 성공 시 로컬 상태 제거 + listSessions 검증", () => {
  test("원격 삭제 성공 후 removeSessionMeta 호출 및 listSessions()에서 해당 항목 제거", async () => {
    // 1. 씨드: 활성 세션 설정
    localStorage.setItem(ACTIVE_KEY, "target-session");
    localStorage.setItem(
      sessionKey("target-session"),
      JSON.stringify(makeSessionState("target-session", "삭제대상개념")),
    );
    upsertSessionMeta({
      sessionId: "target-session",
      createdAt: 100,
      conceptSummary: "삭제대상개념",
      stage: "input",
    });

    // 삭제 전: listSessions() 에 항목 존재 확인
    expect(listSessions().some((m) => m.sessionId === "target-session")).toBe(true);

    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");

    const user = userEvent.setup();
    renderApp(["/"]);

    // 2. 사이드바에서 대상 항목의 삭제 버튼 클릭
    const item = (await waitFor(() =>
      screen
        .getAllByText("삭제대상개념")
        .map((el) => el.closest(".sb-history-item"))
        .find(Boolean),
    )) as HTMLElement;

    await user.click(within(item).getByLabelText("세션 삭제"));

    // 3. removeSessionMeta 호출 대기
    await waitFor(() => {
      expect(removeMetaSpy).toHaveBeenCalledWith("target-session");
    });

    // 4. listSessions() 에서 삭제 항목 없음 검증
    expect(listSessions().some((m) => m.sessionId === "target-session")).toBe(false);

    // 5. localStorage 세션 본문도 제거됨
    expect(localStorage.getItem(sessionKey("target-session"))).toBeNull();
  });

  test("비활성 세션 삭제 성공 후 해당 항목만 listSessions()에서 제거되고 다른 항목은 유지된다", async () => {
    // 씨드: 활성 세션 + 삭제할 비활성 세션 + 유지될 다른 비활성 세션
    localStorage.setItem(ACTIVE_KEY, "active-session");
    localStorage.setItem(
      sessionKey("active-session"),
      JSON.stringify(makeSessionState("active-session", "활성개념", { createdAt: 300 })),
    );
    localStorage.setItem(
      sessionKey("delete-target"),
      JSON.stringify(makeSessionState("delete-target", "삭제될개념", { createdAt: 200 })),
    );
    localStorage.setItem(
      sessionKey("keep-session"),
      JSON.stringify(makeSessionState("keep-session", "유지될개념", { createdAt: 100 })),
    );

    upsertSessionMeta({ sessionId: "active-session", createdAt: 300, conceptSummary: "활성개념", stage: "input" });
    upsertSessionMeta({ sessionId: "delete-target", createdAt: 200, conceptSummary: "삭제될개념", stage: "input" });
    upsertSessionMeta({ sessionId: "keep-session", createdAt: 100, conceptSummary: "유지될개념", stage: "input" });

    // 삭제 전 3건 존재
    expect(listSessions()).toHaveLength(3);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 삭제할 비활성 세션 항목 클릭
    const item = (await waitFor(() =>
      screen.getByText("삭제될개념").closest(".sb-history-item"),
    )) as HTMLElement;

    await user.click(within(item).getByLabelText("세션 삭제"));

    // 삭제 완료 대기: 해당 항목이 listSessions()에서 사라질 때까지
    await waitFor(() => {
      expect(listSessions().some((m) => m.sessionId === "delete-target")).toBe(false);
    });

    // 삭제 후 2건만 남아야 함
    const remaining = listSessions();
    expect(remaining).toHaveLength(2);

    // 활성 세션 유지
    expect(remaining.some((m) => m.sessionId === "active-session")).toBe(true);

    // 다른 비활성 세션도 유지
    expect(remaining.some((m) => m.sessionId === "keep-session")).toBe(true);

    // 삭제된 항목의 localStorage 본문도 제거
    expect(localStorage.getItem(sessionKey("delete-target"))).toBeNull();

    // 유지된 항목들의 localStorage 본문은 보존
    expect(localStorage.getItem(sessionKey("active-session"))).not.toBeNull();
    expect(localStorage.getItem(sessionKey("keep-session"))).not.toBeNull();
  });

  test("deleteSessionRemote resolve 후 setSessions 업데이트로 React 상태에서도 삭제 항목 제거", async () => {
    // 씨드: 2개 세션
    localStorage.setItem(ACTIVE_KEY, "sess-a");
    localStorage.setItem(
      sessionKey("sess-a"),
      JSON.stringify(makeSessionState("sess-a", "개념A", { createdAt: 200 })),
    );
    localStorage.setItem(
      sessionKey("sess-b"),
      JSON.stringify(makeSessionState("sess-b", "개념B", { createdAt: 100 })),
    );
    upsertSessionMeta({ sessionId: "sess-a", createdAt: 200, conceptSummary: "개념A", stage: "input" });
    upsertSessionMeta({ sessionId: "sess-b", createdAt: 100, conceptSummary: "개념B", stage: "input" });

    const user = userEvent.setup();
    renderApp(["/"]);

    // 사이드바에서 비활성 세션(sess-b) 항목 확인
    const item = (await waitFor(() =>
      screen.getByText("개념B").closest(".sb-history-item"),
    )) as HTMLElement;

    // 삭제 버튼 클릭
    await user.click(within(item).getByLabelText("세션 삭제"));

    // 삭제 완료 후: 사이드바에서 해당 항목이 사라짐
    await waitFor(() => {
      expect(screen.queryByText("개념B")).not.toBeInTheDocument();
    });

    // listSessions() 에서도 제거 확인
    expect(listSessions().some((m) => m.sessionId === "sess-b")).toBe(false);

    // 다른 세션(개념A)은 유지
    expect(listSessions().some((m) => m.sessionId === "sess-a")).toBe(true);
  });
});
