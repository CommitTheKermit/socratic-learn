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
// 사이드바 목록의 진실 출처는 원격(listSessionsRemote)이므로 각 테스트에서 mockResolvedValue 로 채운다.
// 낙관적 삭제: 로컬(본문 캐시/메모리 목록)을 즉시 제거하고 원격은 뒤따라 호출된다(성공 시 tombstone 해제).
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import { listSessionsRemote } from "../api/sessionApi";
import { sessionKey } from "../state/sessionPersist";
import { listTombstones } from "../state/sessionTombstone";
import type { SessionIndexEntry } from "../api/contract";
import App from "../App";

const ACTIVE_KEY = "socratic:activeSessionId";

function renderApp(entries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

/**
 * 사이드바 히스토리 항목을 concept 텍스트로 찾는다.
 * 목록은 원격(비동기)으로 채워지므로 항목이 나타날 때까지 대기한다. 활성 세션의 concept 은
 * 메인 화면에도 보일 수 있어 .sb-history-item 으로 한정한다.
 */
async function findHistoryItem(concept: string): Promise<HTMLElement> {
  return (await waitFor(() => {
    const el = screen
      .getAllByText(concept)
      .map((n) => n.closest<HTMLElement>(".sb-history-item"))
      .find(Boolean);
    expect(el).toBeTruthy();
    return el!;
  }));
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

/** 원격 목록 mock 을 채운다(사이드바에 세션이 나타나게 한다). */
function seedRemoteList(entries: SessionIndexEntry[]) {
  vi.mocked(listSessionsRemote).mockResolvedValue(entries);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("낙관적 삭제: 로컬 즉시 제거 + tombstone, 원격은 뒤따라 호출", () => {
  test("deleteSessionRemote 가 pending 이어도 클릭 즉시 로컬을 제거하고 tombstone 을 기록한다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(
        seededState({ sessionId: "active-1", stage: "input", concept: "활성개념", conceptSummary: "활성개념" }),
      ),
    );
    seedRemoteList([{ sessionId: "active-1", conceptSummary: "활성개념", stage: "input", updatedAt: 5 }]);

    // deleteSessionRemote 가 절대 resolve 되지 않는 pending 상태로 고정
    const { deleteSessionRemote: mockDeleteRemote } = await import("../api/sessionApi");
    vi.mocked(mockDeleteRemote).mockImplementation(() => new Promise(() => undefined));

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = await findHistoryItem("활성개념");

    await user.click(within(item).getByLabelText("세션 삭제"));

    // 낙관적: 원격이 pending 이어도 본문 캐시는 즉시 제거된다
    expect(localStorage.getItem(sessionKey("active-1"))).toBeNull();
    // tombstone 에 기록되어, 원격 미완료 상태에서도 재출현이 차단된다
    expect(listTombstones().has("active-1")).toBe(true);
    // 원격 삭제는 (뒤따라) 호출되었다
    expect(mockDeleteRemote).toHaveBeenCalledWith("active-1");
  });

  test("원격 삭제 성공 시 tombstone 이 해제된다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-ok");
    localStorage.setItem(
      sessionKey("active-ok"),
      JSON.stringify(seededState({ sessionId: "active-ok", concept: "성공개념", conceptSummary: "성공개념" })),
    );
    seedRemoteList([{ sessionId: "active-ok", conceptSummary: "성공개념", stage: "input", updatedAt: 9 }]);

    const { deleteSessionRemote: mockDeleteRemote } = await import("../api/sessionApi");
    vi.mocked(mockDeleteRemote).mockResolvedValue(undefined);

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = await findHistoryItem("성공개념");

    await user.click(within(item).getByLabelText("세션 삭제"));

    // 원격 성공이 반영되면 tombstone 이 비워진다
    await waitFor(() => {
      expect(listTombstones().has("active-ok")).toBe(false);
    });
  });
});

describe("AC2: App.tsx deleteSession", () => {
  test("활성 세션 삭제 시 본문 키 제거 후 홈(input)으로 이동한다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    // 루트 진입 시 활성 세션(input)으로 복원된다.
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(
        seededState({ sessionId: "active-1", stage: "input", concept: "활성개념", conceptSummary: "활성개념" }),
      ),
    );
    seedRemoteList([{ sessionId: "active-1", conceptSummary: "활성개념", stage: "input", updatedAt: 5 }]);

    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    renderApp(["/"]);

    // input 단계로 복원된 활성 세션은 concept 이 메인 화면과 사이드바 양쪽에 표시되므로
    // 사이드바 히스토리 항목으로 한정해 조회한다.
    const item = await findHistoryItem("활성개념");
    await user.click(within(item).getByLabelText("세션 삭제"));

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

  test("비활성 세션 삭제 시 본문 키만 제거하고 활성 세션은 유지한다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(seededState({ sessionId: "active-1", concept: "활성개념", conceptSummary: "활성개념" })),
    );
    localStorage.setItem(
      sessionKey("other-2"),
      JSON.stringify(seededState({ sessionId: "other-2", concept: "다른개념", conceptSummary: "다른개념" })),
    );
    seedRemoteList([
      { sessionId: "active-1", conceptSummary: "활성개념", stage: "input", updatedAt: 5 },
      { sessionId: "other-2", conceptSummary: "다른개념", stage: "input", updatedAt: 2 },
    ]);

    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = await findHistoryItem("다른개념");
    await user.click(within(item).getByLabelText("세션 삭제"));

    expect(removeItemSpy).toHaveBeenCalledWith(sessionKey("other-2"));

    // 활성 세션은 그대로 유지된다.
    expect(localStorage.getItem(ACTIVE_KEY)).toBe("active-1");
    expect(localStorage.getItem(sessionKey("other-2"))).toBeNull();
    expect(localStorage.getItem(sessionKey("active-1"))).not.toBeNull();
    // 비활성 삭제는 사이드바 목록(화면)에서만 사라진다.
    await waitFor(() => {
      expect(screen.queryByText("다른개념")).not.toBeInTheDocument();
    });
  });
});
