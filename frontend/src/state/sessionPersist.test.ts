import { describe, test, expect, beforeEach } from "vitest";
import {
  persistSession,
  sessionKey,
  SESSION_KEY_PREFIX,
} from "./sessionPersist";
import { deserializeSessionState, type SessionState } from "./sessionState";

/** 키/값 기록을 검증하기 위한 최소 localStorage mock. */
function createStorageMock(): Storage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get length() {
      return store.size;
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
  };
}

function fullState(): SessionState {
  return {
    sessionId: "s-123",
    createdAt: 1717000000000,
    conceptSummary: "코루틴이 왜 필요한지",
    stage: "learn",
    depth: "1depth",
    concept: "코루틴이 왜 필요한지",
    materials: "참고 자료 텍스트",
    probes: { p1: 2, p2: ["thread", "suspend"], p3: "비동기 처리" },
    estimatedLevel: 3,
    stepIdx: 2,
    answers: { "1-1": "동시성은 번갈아" },
    skips: { "3-1": true },
  };
}

describe("persistSession", () => {
  let storage: ReturnType<typeof createStorageMock>;

  beforeEach(() => {
    storage = createStorageMock();
  });

  test("sessionId 기반 키로 세션 본문을 기록한다", () => {
    persistSession(fullState(), storage);
    expect(storage.store.has(sessionKey("s-123"))).toBe(true);
    // 본문 캐시 키 1개만(목록 인덱스는 더 이상 쓰지 않는다)
    expect(storage.store.size).toBe(1);
  });

  test("키는 SESSION_KEY_PREFIX + sessionId 형식이다", () => {
    persistSession(fullState(), storage);
    expect(sessionKey("s-123")).toBe(`${SESSION_KEY_PREFIX}s-123`);
    const sessionKeys = [...storage.store.keys()].filter((k) =>
      k.startsWith(SESSION_KEY_PREFIX),
    );
    expect(sessionKeys).toEqual([`${SESSION_KEY_PREFIX}s-123`]);
  });

  test("기록된 값은 round-trip 시 원본 상태로 복원된다", () => {
    const state = fullState();
    persistSession(state, storage);
    const raw = storage.getItem(sessionKey("s-123"));
    expect(raw).not.toBeNull();
    // fieldUpdatedAt 누락 입력은 빈 객체로 정규화된다.
    expect(deserializeSessionState(raw!)).toEqual({ ...state, fieldUpdatedAt: {} });
  });

  test("같은 세션 재저장 시 값이 덮어써지고 세션 키 수는 유지된다", () => {
    persistSession(fullState(), storage);
    persistSession({ ...fullState(), stepIdx: 9 }, storage);
    const sessionKeys = [...storage.store.keys()].filter((k) =>
      k.startsWith(SESSION_KEY_PREFIX),
    );
    expect(sessionKeys).toEqual([sessionKey("s-123")]);
    const restored = deserializeSessionState(storage.getItem(sessionKey("s-123"))!);
    expect(restored.stepIdx).toBe(9);
  });

  test("서로 다른 세션은 별도 키로 분리 저장된다", () => {
    persistSession({ ...fullState(), sessionId: "a" }, storage);
    persistSession({ ...fullState(), sessionId: "b" }, storage);
    const sessionKeys = [...storage.store.keys()].filter((k) =>
      k.startsWith(SESSION_KEY_PREFIX),
    );
    expect(sessionKeys).toHaveLength(2);
    expect(storage.store.has(sessionKey("a"))).toBe(true);
    expect(storage.store.has(sessionKey("b"))).toBe(true);
  });
});
