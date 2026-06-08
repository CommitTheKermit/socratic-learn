/**
 * Sub-AC 5c: deleteSession 성공 시 로컬 상태 제거 + 사이드바 목록 반영 검증
 *
 * 검증 항목:
 * 1. deleteSessionRemote resolve(성공) 후 본문 캐시 removeItem
 * 2. 이후 사이드바 목록(화면)에서 삭제 항목 사라짐
 * 3. 비활성 세션 삭제 후 활성 세션 및 다른 항목의 본문 캐시는 그대로 유지
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

// deleteSessionRemote 성공(resolve) mock. 사이드바 목록은 원격(listSessionsRemote)에서 온다.
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import { listSessionsRemote, deleteSessionRemote } from "../api/sessionApi";
import { sessionKey } from "../state/sessionPersist";
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
 * 목록은 원격(비동기)으로 채워지므로 항목이 나타날 때까지 대기한다.
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

describe("Sub-AC 5c: deleteSession 성공 시 로컬 상태 제거 + 사이드바 목록 반영", () => {
  test("원격 삭제 성공 후 본문 캐시 제거 및 사이드바 목록에서 해당 항목 제거", async () => {
    // 1. 씨드: 활성 세션 설정
    localStorage.setItem(ACTIVE_KEY, "target-session");
    localStorage.setItem(
      sessionKey("target-session"),
      JSON.stringify(makeSessionState("target-session", "삭제대상개념")),
    );
    seedRemoteList([{ sessionId: "target-session", conceptSummary: "삭제대상개념", stage: "input", updatedAt: 100 }]);
    // 활성 세션 삭제는 홈("/")으로 이동해 목록을 다시 fetch 한다. 원격 삭제가 성공하면
    // Firestore 에서도 사라지므로, 그 시점부터 원격 목록이 빈 배열을 반환하도록 mock 을 갱신한다.
    vi.mocked(deleteSessionRemote).mockImplementation(async () => {
      vi.mocked(listSessionsRemote).mockResolvedValue([]);
    });

    const user = userEvent.setup();
    renderApp(["/"]);

    // 2. 사이드바에서 대상 항목의 삭제 버튼 클릭
    const item = await findHistoryItem("삭제대상개념");

    await user.click(within(item).getByLabelText("세션 삭제"));

    // 3. 사이드바 목록(화면)에서 삭제 항목 사라짐 대기
    await waitFor(() => {
      expect(screen.queryByText("삭제대상개념")).not.toBeInTheDocument();
    });

    // 4. localStorage 세션 본문도 제거됨
    expect(localStorage.getItem(sessionKey("target-session"))).toBeNull();
  });

  test("비활성 세션 삭제 성공 후 해당 항목만 목록에서 제거되고 다른 항목은 유지된다", async () => {
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
    seedRemoteList([
      { sessionId: "active-session", conceptSummary: "활성개념", stage: "input", updatedAt: 300 },
      { sessionId: "delete-target", conceptSummary: "삭제될개념", stage: "input", updatedAt: 200 },
      { sessionId: "keep-session", conceptSummary: "유지될개념", stage: "input", updatedAt: 100 },
    ]);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 삭제 전 3건이 사이드바에 표시된다
    await waitFor(() => {
      expect(document.querySelectorAll(".sb-history-item")).toHaveLength(3);
    });

    // 삭제할 비활성 세션 항목 클릭
    const item = await findHistoryItem("삭제될개념");

    await user.click(within(item).getByLabelText("세션 삭제"));

    // 삭제 완료 대기: 해당 항목이 화면에서 사라질 때까지
    await waitFor(() => {
      expect(screen.queryByText("삭제될개념")).not.toBeInTheDocument();
    });

    // 삭제 후 2건만 남아야 함
    expect(document.querySelectorAll(".sb-history-item")).toHaveLength(2);

    // 삭제된 항목의 localStorage 본문도 제거
    expect(localStorage.getItem(sessionKey("delete-target"))).toBeNull();

    // 유지된 항목들의 localStorage 본문은 보존
    expect(localStorage.getItem(sessionKey("active-session"))).not.toBeNull();
    expect(localStorage.getItem(sessionKey("keep-session"))).not.toBeNull();
  });

  test("deleteSessionRemote resolve 후 setSessions 업데이트로 사이드바에서도 삭제 항목 제거", async () => {
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
    seedRemoteList([
      { sessionId: "sess-a", conceptSummary: "개념A", stage: "input", updatedAt: 200 },
      { sessionId: "sess-b", conceptSummary: "개념B", stage: "input", updatedAt: 100 },
    ]);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 사이드바에서 비활성 세션(sess-b) 항목 확인
    const item = await findHistoryItem("개념B");

    // 삭제 버튼 클릭
    await user.click(within(item).getByLabelText("세션 삭제"));

    // 삭제 완료 후: 사이드바에서 해당 항목이 사라짐
    await waitFor(() => {
      expect(screen.queryByText("개념B")).not.toBeInTheDocument();
    });

    // 다른 세션(개념A)은 유지
    expect(screen.getAllByText("개념A").length).toBeGreaterThan(0);
  });
});
