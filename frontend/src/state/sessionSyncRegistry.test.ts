import { describe, test, expect, beforeEach } from "vitest";
import { markComplete, isComplete } from "./sessionSyncRegistry";

/**
 * sessionSyncRegistry 는 모듈 스코프 Set 을 유지하므로
 * 테스트 간 격리를 위해 vitest 의 모듈 재로드를 활용한다.
 * 각 테스트 전에 모듈을 새로 import 해 Set 초기화를 보장한다.
 */
describe("sessionSyncRegistry", () => {
  // 각 테스트에서 신선한 모듈 인스턴스를 사용한다.
  let fresh: { markComplete: typeof markComplete; isComplete: typeof isComplete };

  beforeEach(async () => {
    // vi.resetModules() 로 모듈 캐시를 비우고 동적 import 로 새 인스턴스를 얻는다.
    const { vi } = await import("vitest");
    vi.resetModules();
    fresh = await import("./sessionSyncRegistry");
  });

  test("초기 상태에서 isComplete 는 항상 false 를 반환한다", () => {
    expect(fresh.isComplete("session-abc")).toBe(false);
  });

  test("markComplete 호출 후 같은 sessionId 의 isComplete 가 true 를 반환한다", () => {
    fresh.markComplete("session-xyz");
    expect(fresh.isComplete("session-xyz")).toBe(true);
  });

  test("markComplete 한 sessionId 와 다른 sessionId 는 여전히 false 를 반환한다", () => {
    fresh.markComplete("session-a");
    expect(fresh.isComplete("session-b")).toBe(false);
  });

  test("여러 sessionId 를 각각 markComplete 할 수 있다", () => {
    fresh.markComplete("s-1");
    fresh.markComplete("s-2");
    expect(fresh.isComplete("s-1")).toBe(true);
    expect(fresh.isComplete("s-2")).toBe(true);
    expect(fresh.isComplete("s-3")).toBe(false);
  });

  test("동일 sessionId 를 여러 번 markComplete 해도 오류 없이 true 를 반환한다", () => {
    fresh.markComplete("session-dup");
    fresh.markComplete("session-dup");
    expect(fresh.isComplete("session-dup")).toBe(true);
  });
});
