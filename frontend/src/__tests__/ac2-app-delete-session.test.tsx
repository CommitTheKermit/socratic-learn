import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// 학습 단계의 콘텐츠 로딩(네트워크/Claude)을 stub 하여 렌더 테스트를 격리한다.
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

// sessionApi - 원격 삭제(deleteSessionRemote)를 성공으로 stub 한다.
// 비관적 삭제: 원격 성공 후 로컬 제거가 일어나므로 테스트는 원격 성공을 전제로 검증한다.
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import * as sessionIndex from "../state/sessionIndex";
import { upsertSessionMeta } from "../state/sessionIndex";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

const ACTIVE_KEY = "socratic:activeSessionId";
const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";

function renderApp(entries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

function seededState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: "seed-1",
    createdAt: 111,
    conceptSummary: "개념",
    stage: "input",
    depth: "2depth",
    concept: "개념",
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

describe("Sub-AC 3a: deleteSession 비관적 삭제 순서 보장", () => {
  test("deleteSessionRemote가 pending인 동안 removeSessionMeta와 localStorage.removeItem을 호출하지 않는다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(
        seededState({ sessionId: "active-1", stage: "input", concept: "활성개념", conceptSummary: "활성개념" }),
      ),
    );
    upsertSessionMeta({ sessionId: "active-1", createdAt: 5, conceptSummary: "활성개념", stage: "input" });

    // deleteSessionRemote 가 절대 resolve 되지 않는 pending 상태로 고정
    const { deleteSessionRemote: mockDeleteRemote } = await import("../api/sessionApi");
    vi.mocked(mockDeleteRemote).mockImplementation(() => new Promise(() => undefined));

    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = (await waitFor(() =>
      screen
        .getAllByText("활성개념")
        .map((el) => el.closest(".sb-history-item"))
        .find(Boolean),
    )) as HTMLElement;

    // 삭제 버튼 클릭 - deleteSessionRemote 는 pending 이라 await 에 걸려 있음
    await user.click(within(item).getByLabelText("세션 삭제"));

    // pending 상태에서는 로컬 삭제가 일어나지 않아야 한다
    expect(removeMetaSpy).not.toHaveBeenCalled();
    // removeItem 은 다른 경로(navigate 등)에서 호출될 수 있으므로
    // sessionKey("active-1") 와 인덱스 키 호출 여부만 확인한다
    const sessionDataKey = sessionKey("active-1");
    const sessionIndexKey = "socratic:sessions:index";
    const removeItemCalls = removeItemSpy.mock.calls.map((c) => c[0]);
    expect(removeItemCalls).not.toContain(sessionDataKey);
    expect(removeItemCalls).not.toContain(sessionIndexKey);
  });
});

describe("AC2: App.tsx deleteSession", () => {
  test("활성 세션 삭제 시 removeSessionMeta+removeItem 호출 후 홈(input)으로 이동한다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    // 루트 진입 시 활성 세션(input)으로 복원된다.
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(
        seededState({ sessionId: "active-1", stage: "input", concept: "활성개념", conceptSummary: "활성개념" }),
      ),
    );
    upsertSessionMeta({ sessionId: "active-1", createdAt: 5, conceptSummary: "활성개념", stage: "input" });

    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    renderApp(["/"]);

    // input 단계로 복원된 활성 세션은 concept 이 메인 화면과 사이드바 양쪽에 표시되므로
    // 사이드바 히스토리 항목으로 한정해 조회한다.
    const item = (await waitFor(() =>
      screen
        .getAllByText("활성개념")
        .map((el) => el.closest(".sb-history-item"))
        .find(Boolean),
    )) as HTMLElement;
    await user.click(within(item).getByLabelText("세션 삭제"));

    expect(removeMetaSpy).toHaveBeenCalledWith("active-1");
    expect(removeItemSpy).toHaveBeenCalledWith(sessionKey("active-1"));

    // 활성 세션이었으므로 홈(input)으로 이동해 빈 입력 화면이 된다.
    await waitFor(() =>
      expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("input"),
    );
    // 활성 키가 비워진다(홈 = 새 세션 대기 상태).
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
    // 삭제된 세션의 본문 키는 제거되었다.
    expect(localStorage.getItem(sessionKey("active-1"))).toBeNull();
  });

  test("비활성 세션 삭제 시 인덱스/본문 키만 제거하고 활성 세션은 유지한다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(seededState({ sessionId: "active-1", concept: "활성개념", conceptSummary: "활성개념" })),
    );
    localStorage.setItem(
      sessionKey("other-2"),
      JSON.stringify(seededState({ sessionId: "other-2", concept: "다른개념", conceptSummary: "다른개념" })),
    );
    upsertSessionMeta({ sessionId: "active-1", createdAt: 5, conceptSummary: "활성개념", stage: "input" });
    upsertSessionMeta({ sessionId: "other-2", createdAt: 2, conceptSummary: "다른개념", stage: "input" });

    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = (await waitFor(() =>
      screen.getByText("다른개념").closest(".sb-history-item"),
    )) as HTMLElement;
    await user.click(within(item).getByLabelText("세션 삭제"));

    expect(removeMetaSpy).toHaveBeenCalledWith("other-2");
    expect(removeItemSpy).toHaveBeenCalledWith(sessionKey("other-2"));

    // 활성 세션은 그대로 유지된다.
    expect(localStorage.getItem(ACTIVE_KEY)).toBe("active-1");
    expect(localStorage.getItem(sessionKey("other-2"))).toBeNull();
    expect(localStorage.getItem(sessionKey("active-1"))).not.toBeNull();
    // 비활성 삭제는 인덱스에서만 사라진다.
    expect(sessionIndex.listSessions().some((m) => m.sessionId === "other-2")).toBe(false);
  });
});
