import { describe, test, expect, beforeEach } from "vitest";
import { hasSynced, markSynced, _resetForTest } from "./fetchOncePerSession";

beforeEach(() => {
  _resetForTest();
});

describe("fetchOncePerSession 레지스트리", () => {
  test("초기 상태: 어떤 sessionId도 synced 가 아니다", () => {
    expect(hasSynced("s-abc")).toBe(false);
    expect(hasSynced("s-xyz")).toBe(false);
  });

  test("markSynced 후 hasSynced 가 true 를 반환한다", () => {
    markSynced("s-abc");
    expect(hasSynced("s-abc")).toBe(true);
  });

  test("서로 다른 두 sessionId 가 독립적으로 완료 기록된다", () => {
    markSynced("s-001");

    // s-001 은 완료됐지만 s-002 는 아직 완료되지 않았다
    expect(hasSynced("s-001")).toBe(true);
    expect(hasSynced("s-002")).toBe(false);

    markSynced("s-002");

    // 이제 둘 다 완료 상태이며 서로에게 영향을 주지 않는다
    expect(hasSynced("s-001")).toBe(true);
    expect(hasSynced("s-002")).toBe(true);
  });

  test("s-002 완료가 s-001 상태에 영향을 주지 않는다", () => {
    markSynced("s-001");
    markSynced("s-002");

    // s-002 를 별도로 추가해도 s-001 상태는 그대로다
    expect(hasSynced("s-001")).toBe(true);
  });

  test("s-001 미완료 상태에서 s-002 완료가 s-001 을 완료로 바꾸지 않는다", () => {
    markSynced("s-002");

    expect(hasSynced("s-001")).toBe(false);
  });

  test("_resetForTest 후 모든 상태가 초기화된다", () => {
    markSynced("s-abc");
    markSynced("s-xyz");

    _resetForTest();

    expect(hasSynced("s-abc")).toBe(false);
    expect(hasSynced("s-xyz")).toBe(false);
  });

  test("동일 sessionId 를 여러 번 markSynced 해도 상태는 true 로 유지된다", () => {
    markSynced("s-dup");
    markSynced("s-dup");

    expect(hasSynced("s-dup")).toBe(true);
  });
});
