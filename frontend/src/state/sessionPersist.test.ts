import { describe, test, expect, beforeEach } from "vitest";
import {
  persistSession,
  sessionKey,
  SESSION_KEY_PREFIX,
} from "./sessionPersist";
import { deserializeSessionState, type SessionState } from "./sessionState";
import { listSessions, SESSIONS_INDEX_KEY } from "./sessionIndex";

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
    explainStreamComplete: true,
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
    // 세션 본문 키 1개 + 인덱스 키 1개
    expect(storage.store.size).toBe(2);
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
    expect(deserializeSessionState(raw!)).toEqual(state);
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

  describe("인덱스 통합 (upsertSessionMeta)", () => {
    test("저장 시 인덱스에 메타가 갱신된다", () => {
      persistSession(fullState(), storage);
      expect(storage.store.has(SESSIONS_INDEX_KEY)).toBe(true);
      const metas = listSessions(storage);
      expect(metas).toHaveLength(1);
      expect(metas[0]).toEqual({
        sessionId: "s-123",
        createdAt: 1717000000000,
        conceptSummary: "코루틴이 왜 필요한지",
        stage: "learn",
      });
    });

    test("같은 sessionId 재저장 시 createdAt 은 보존되고 conceptSummary/stage 는 갱신된다", () => {
      persistSession(fullState(), storage);
      persistSession(
        {
          ...fullState(),
          createdAt: 9999999999999,
          conceptSummary: "갱신된 요약",
          stage: "done",
        },
        storage,
      );
      const metas = listSessions(storage);
      expect(metas).toHaveLength(1);
      expect(metas[0]).toEqual({
        sessionId: "s-123",
        createdAt: 1717000000000,
        conceptSummary: "갱신된 요약",
        stage: "done",
      });
    });

    test("서로 다른 세션은 인덱스에 각각 한 건씩 쌓인다", () => {
      persistSession({ ...fullState(), sessionId: "a", createdAt: 1000 }, storage);
      persistSession({ ...fullState(), sessionId: "b", createdAt: 2000 }, storage);
      const ids = listSessions(storage).map((m) => m.sessionId);
      expect(ids).toEqual(["b", "a"]);
    });
  });
});
