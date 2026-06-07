import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { _resetForTest } from "../state/fetchOncePerSession";

/**
 * AC3: 첫 진입 fetch 가 실패(reject)하면 완료 플래그가 설정되지 않아,
 * 같은 탭에서 같은 세션 다음 진입 시 fetchAndMerge 가 다시 1회 시도된다.
 *
 * 검증 대상: App.tsx 의 AppSession useEffect - .catch() 블록이 syncedSessionIds 에
 * 추가하지 않음으로써 다음 마운트 시 재시도가 이루어지는지 확인한다.
 */

const mockFetchAndMerge = vi.fn();

vi.mock("../state/sessionSync", () => ({
  fetchAndMerge: (...args: unknown[]) => mockFetchAndMerge(...args),
  fetchRemoteSessionList: vi.fn().mockResolvedValue([]),
  mergeSessionLists: vi.fn((local: unknown) => local),
  persistWithSync: vi.fn((snap: unknown) => snap),
}));

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

import App from "../App";

function renderApp(entries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

describe("AC3: fetch 실패 시 완료 플래그 미설정 - 다음 진입에 재시도", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchAndMerge.mockReset();
    // fetchOncePerSession 레지스트리를 초기화해 이전 테스트의 markSynced 결과가 남지 않도록 한다.
    _resetForTest();
  });

  it("fetchAndMerge 가 reject 되면 syncedSessionIds 에 추가되지 않아 재진입 시 다시 1회 호출된다", async () => {
    // fetchAndMerge 가 항상 실패하도록 설정(네트워크 오류 시뮬레이션).
    mockFetchAndMerge.mockRejectedValue(new Error("network error"));

    // 고유 세션 ID - 다른 테스트와 충돌하지 않도록 AC3 전용 값 사용.
    const SESSION_ID = "s-ac3-fail-retry-unique";

    // 첫 번째 진입
    const { unmount } = renderApp([`/s/${SESSION_ID}`]);

    // fetchAndMerge 가 1회 호출될 때까지 대기.
    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
    });
    expect(mockFetchAndMerge).toHaveBeenCalledTimes(1);

    // 첫 fetch 가 실패(reject)해 settled 될 때까지 대기.
    // .catch() 가 syncedSessionIds 에 추가하지 않았음을 확인하기 위해
    // 비동기 settled 를 흘려보낸다(microtask flush).
    await new Promise((r) => setTimeout(r, 0));

    // 세션을 벗어남 - AppSession 언마운트로 재마운트 시뮬레이션.
    unmount();

    // 같은 세션으로 재진입(재마운트). 실패로 인해 syncedSessionIds 에 없으므로 다시 시도.
    renderApp([`/s/${SESSION_ID}`]);

    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledTimes(2);
    });

    // 두 번의 호출 모두 동일 sessionId 에 대해 이루어진다.
    expect(mockFetchAndMerge).toHaveBeenNthCalledWith(1, SESSION_ID);
    expect(mockFetchAndMerge).toHaveBeenNthCalledWith(2, SESSION_ID);
  });

  it("fetch 실패 후 재진입 시 에러 UI(에러 배너/재시도 버튼 등)가 렌더되지 않는다", async () => {
    mockFetchAndMerge.mockRejectedValue(new Error("network error"));
    const SESSION_ID = "s-ac3-no-error-ui-unique";

    const { container, unmount } = renderApp([`/s/${SESSION_ID}`]);

    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
    });

    // fetch 가 settled 될 때까지 대기.
    await new Promise((r) => setTimeout(r, 0));

    // 에러 UI 가 렌더되지 않는다 - 에러 배너, 재시도 버튼, 새로고침 버튼 모두 없음.
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.querySelector(".error-banner")).toBeNull();
    expect(container.querySelector(".retry-btn")).toBeNull();
    expect(container.querySelector(".refresh-btn")).toBeNull();

    // 재진입에서도 에러 UI 없이 조용히 재시도한다.
    unmount();
    const { container: container2 } = renderApp([`/s/${SESSION_ID}`]);
    await waitFor(() => expect(mockFetchAndMerge).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 0));

    expect(container2.querySelector("[role='alert']")).toBeNull();
    expect(container2.querySelector(".error-banner")).toBeNull();
  });
});
