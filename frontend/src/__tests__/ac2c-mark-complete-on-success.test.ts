import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasSynced, markSynced, _resetForTest } from "../state/fetchOncePerSession";

/**
 * Sub-AC 2-C: fetchAndMerge 성공/실패 시 markComplete(markSynced) 호출 여부와
 * 이후 isComplete(hasSynced) 상태를 검증하는 단위 테스트.
 *
 * App.tsx AppSession useEffect 의 핵심 로직:
 *   fetchAndMerge(sessionId)
 *     .then(() => { markSynced(sessionId); })   // 성공 시에만 완료로 기록
 *     .catch(() => { });                         // 실패 시 silent - markSynced 미호출
 *
 * 검증 목적:
 * - 성공(resolve): markSynced 호출 -> hasSynced 가 true 반환
 * - 실패(reject) : markSynced 미호출 -> hasSynced 가 false 유지
 */

/** App.tsx AppSession useEffect 의 동기화 로직을 추출한 순수 함수. */
async function runSyncOnce(
  sessionId: string,
  fetchAndMerge: (id: string) => Promise<unknown>,
): Promise<void> {
  if (hasSynced(sessionId)) return;
  await fetchAndMerge(sessionId)
    .then(() => {
      markSynced(sessionId);
    })
    .catch(() => {
      // 실패 시 markSynced 를 호출하지 않아 다음 진입에 재시도 가능하게 한다.
    });
}

describe("Sub-AC 2-C: fetchAndMerge 성공/실패에 따른 isComplete 상태 검증", () => {
  beforeEach(() => {
    _resetForTest();
    vi.clearAllMocks();
  });

  it("fetchAndMerge 가 성공(resolve)하면 markSynced 가 호출되어 hasSynced 가 true 를 반환한다", async () => {
    const SESSION_ID = "s-2c-success";
    const mockFetch = vi.fn<[string], Promise<null>>().mockResolvedValue(null);

    await runSyncOnce(SESSION_ID, mockFetch);

    // markSynced(sessionId) 가 호출됐어야 한다 - hasSynced 로 검증
    expect(hasSynced(SESSION_ID)).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(SESSION_ID);
  });

  it("fetchAndMerge 가 실패(reject)하면 markSynced 가 호출되지 않아 hasSynced 가 false 를 유지한다", async () => {
    const SESSION_ID = "s-2c-fail";
    const mockFetch = vi.fn<[string], Promise<never>>().mockRejectedValue(new Error("network error"));

    await runSyncOnce(SESSION_ID, mockFetch);

    // markSynced 가 호출되지 않았으므로 hasSynced 는 여전히 false 여야 한다
    expect(hasSynced(SESSION_ID)).toBe(false);
    expect(mockFetch).toHaveBeenCalledWith(SESSION_ID);
  });

  it("성공 후 같은 sessionId 로 재호출해도 fetchAndMerge 는 다시 실행되지 않는다(1회 제한)", async () => {
    const SESSION_ID = "s-2c-once";
    const mockFetch = vi.fn<[string], Promise<null>>().mockResolvedValue(null);

    await runSyncOnce(SESSION_ID, mockFetch);
    await runSyncOnce(SESSION_ID, mockFetch);

    // markSynced 가 첫 번째 호출 후 등록되므로 두 번째는 hasSynced 가드에서 조기 반환
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(hasSynced(SESSION_ID)).toBe(true);
  });

  it("실패 후 같은 sessionId 로 재호출하면 fetchAndMerge 를 다시 시도한다(재시도 허용)", async () => {
    const SESSION_ID = "s-2c-retry";
    const mockFetch = vi.fn<[string], Promise<null>>();
    mockFetch
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValue(null);

    // 첫 번째: 실패 -> markSynced 미호출
    await runSyncOnce(SESSION_ID, mockFetch);
    expect(hasSynced(SESSION_ID)).toBe(false);

    // 두 번째: 재시도 -> 성공 -> markSynced 호출
    await runSyncOnce(SESSION_ID, mockFetch);
    expect(hasSynced(SESSION_ID)).toBe(true);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
