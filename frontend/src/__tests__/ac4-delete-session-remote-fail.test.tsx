/**
 * AC 4 (낙관적 삭제): deleteSessionRemote reject 시 로컬은 즉시 제거되고
 * tombstone 이 유지되어 재출현이 차단되며 console.error 정확히 1회.
 *
 * 검증 항목:
 * 1. console.error spy: 정확히 1회 호출
 * 2. localStorage.removeItem(sessionKey(id)): 본문 즉시 제거
 * 3. 세션 항목이 사이드바 목록에서 사라짐
 * 4. tombstone 에 해당 id 가 남아 다음 접속 병합 시 재출현이 차단됨
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

// deleteSessionRemote 는 각 테스트에서 reject 로 덮어쓴다.
// 사이드바 목록의 진실 출처는 원격(listSessionsRemote)이므로 각 테스트에서 mockResolvedValue 로 채운다.
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import * as sessionApiModule from "../api/sessionApi";
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

function seededState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: "del-fail-1",
    createdAt: 111,
    conceptSummary: "삭제실패개념",
    stage: "input",
    mode: "2depth",
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

describe("AC 4 (낙관적): deleteSessionRemote 실패 시 로컬 즉시 제거 + tombstone 유지 + console.error 1회", () => {
  test("원격 삭제 reject 시 로컬 즉시 제거 + tombstone 유지 + console.error 1회 + alert 없음", async () => {
    // 1. 로컬 상태 씨드
    localStorage.setItem(ACTIVE_KEY, "del-fail-1");
    localStorage.setItem(
      sessionKey("del-fail-1"),
      JSON.stringify(seededState()),
    );
    seedRemoteList([{ sessionId: "del-fail-1", conceptSummary: "삭제실패개념", stage: "input", updatedAt: 111 }]);

    // 2. deleteSessionRemote → reject
    const networkError = new Error("Network Error");
    vi.mocked(sessionApiModule.deleteSessionRemote).mockRejectedValue(networkError);

    // 3. spy 설정
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 4. 사이드바 목록에서 세션 항목 찾기
    const item = await findHistoryItem("삭제실패개념");

    // 5. 삭제 버튼 클릭
    await user.click(within(item).getByLabelText("세션 삭제"));

    // 6. reject 처리 완료 대기 (console.error 호출될 때까지)
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // 7. console.error 정확히 1회
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

    // 8. localStorage 본문 즉시 제거
    expect(localStorage.getItem(sessionKey("del-fail-1"))).toBeNull();

    // 9. tombstone 유지 - 다음 접속 병합 시 재출현 차단
    expect(listTombstones().has("del-fail-1")).toBe(true);

    // 10. 다른 UI 알림 없음
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test("원격 삭제 reject(500) 시에도 항목이 사이드바 목록에서 사라지고 tombstone 에 남는다", async () => {
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
    seedRemoteList([
      { sessionId: "active-ok", conceptSummary: "활성개념OK", stage: "input", updatedAt: 200 },
      { sessionId: "del-fail-2", conceptSummary: "삭제실패항목", stage: "input", updatedAt: 100 },
    ]);

    // deleteSessionRemote → reject (HTTP 500 시뮬레이션)
    const serverError = Object.assign(new Error("Internal Server Error"), { status: 500 });
    vi.mocked(sessionApiModule.deleteSessionRemote).mockRejectedValue(serverError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderApp(["/"]);

    // 삭제 시도할 세션 항목 찾기
    const item = await findHistoryItem("삭제실패항목");

    await user.click(within(item).getByLabelText("세션 삭제"));

    // console.error 1회 호출 대기
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // 항목이 사이드바에서 사라짐(낙관적)
    expect(screen.queryByText("삭제실패항목")).not.toBeInTheDocument();

    // 활성 세션은 영향 없음
    expect(screen.getAllByText("활성개념OK").length).toBeGreaterThan(0);

    // 로컬 데이터 즉시 제거 + tombstone 유지
    expect(localStorage.getItem(sessionKey("del-fail-2"))).toBeNull();
    expect(listTombstones().has("del-fail-2")).toBe(true);
  });

  test("4xx 응답(403) reject 도 동일하게 로컬 즉시 제거 + tombstone 유지 + console.error 1회", async () => {
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
    seedRemoteList([{ sessionId: "del-fail-3", conceptSummary: "403삭제실패", stage: "input", updatedAt: 300 }]);

    // 403 에러
    const forbiddenError = Object.assign(new Error("Forbidden"), { status: 403 });
    vi.mocked(sessionApiModule.deleteSessionRemote).mockRejectedValue(forbiddenError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const user = userEvent.setup();
    renderApp(["/"]);

    const item = await findHistoryItem("403삭제실패");

    await user.click(within(item).getByLabelText("세션 삭제"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    // 낙관적 로컬 즉시 제거
    expect(localStorage.getItem(sessionKey("del-fail-3"))).toBeNull();

    // tombstone 유지
    expect(listTombstones().has("del-fail-3")).toBe(true);

    // console.error 정확히 1회 (중복 호출 없음)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
