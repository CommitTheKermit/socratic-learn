import { describe, test, expect, beforeEach } from "vitest";
import { loadSession, persistSession, sessionKey } from "./sessionPersist";
import type { SessionState } from "./sessionState";

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
    sessionId: "s-load",
    createdAt: 1717000000000,
    conceptSummary: "코루틴이 왜 필요한지",
    stage: "learn",
    mode: "1depth",
    concept: "코루틴이 왜 필요한지",
    materials: "참고 자료 텍스트",
    probes: { p1: 2, p2: ["thread", "suspend"], p3: "비동기 처리" },
    estimatedLevel: 3,
    stepIdx: 2,
    answers: { "1-1": "동시성은 번갈아" },
    skips: { "3-1": true },
  };
}

describe("loadSession - 정상 값 복원", () => {
  let storage: ReturnType<typeof createStorageMock>;

  beforeEach(() => {
    storage = createStorageMock();
  });

  test("persist 후 load 하면 동일 상태로 복원된다(round-trip)", () => {
    const state = fullState();
    persistSession(state, storage);
    // fieldUpdatedAt 누락 입력은 빈 객체로 정규화된다.
    expect(loadSession("s-load", storage)).toEqual({ ...state, fieldUpdatedAt: {} });
  });

  test("저장된 모든 필드 값이 그대로 보존된다", () => {
    persistSession(fullState(), storage);
    const restored = loadSession("s-load", storage);
    expect(restored).not.toBeNull();
    expect(restored!.stage).toBe("learn");
    expect(restored!.stepIdx).toBe(2);
    expect(restored!.probes).toEqual({ p1: 2, p2: ["thread", "suspend"], p3: "비동기 처리" });
  });
});

describe("loadSession - 누락 값 폴백", () => {
  let storage: ReturnType<typeof createStorageMock>;

  beforeEach(() => {
    storage = createStorageMock();
  });

  test("키가 없으면 null 을 반환한다", () => {
    expect(loadSession("nope", storage)).toBeNull();
  });

  test("다른 세션만 저장돼 있으면 요청 세션은 null 이다", () => {
    persistSession(fullState(), storage);
    expect(loadSession("other", storage)).toBeNull();
  });

  test("저장 값에 일부 필드가 누락돼도 기본값으로 보정해 복원한다", () => {
    // stage/depth/probes 등이 빠진 부분 저장 값.
    storage.setItem(sessionKey("partial"), JSON.stringify({ sessionId: "partial" }));
    const restored = loadSession("partial", storage);
    expect(restored).not.toBeNull();
    expect(restored!.sessionId).toBe("partial");
    expect(restored!.stage).toBe("input"); // 기본 stage 폴백
    expect(restored!.mode).toBe("socratic"); // 기본 mode 폴백
    expect(restored!.stepIdx).toBe(0);
    expect(restored!.estimatedLevel).toBeNull();
    expect(restored!.probes).toEqual({});
    expect(restored!.answers).toEqual({});
    expect(restored!.skips).toEqual({});
  });

  test("필드 타입이 불일치하면 안전한 기본값으로 폴백한다", () => {
    storage.setItem(
      sessionKey("bad-types"),
      JSON.stringify({
        sessionId: "bad-types",
        stepIdx: "이건 숫자가 아님",
        stage: "존재하지않는stage",
        estimatedLevel: "high",
        answers: "문자열-아님-객체",
      }),
    );
    const restored = loadSession("bad-types", storage);
    expect(restored).not.toBeNull();
    expect(restored!.stepIdx).toBe(0);
    expect(restored!.stage).toBe("input");
    expect(restored!.estimatedLevel).toBeNull();
    expect(restored!.answers).toEqual({});
  });
});

describe("loadSession - 손상 값 폴백", () => {
  let storage: ReturnType<typeof createStorageMock>;

  beforeEach(() => {
    storage = createStorageMock();
  });

  test("JSON 으로 파싱할 수 없는 값이면 throw 없이 null 을 반환한다", () => {
    storage.setItem(sessionKey("corrupt"), "{not-json::::");
    expect(() => loadSession("corrupt", storage)).not.toThrow();
    expect(loadSession("corrupt", storage)).toBeNull();
  });

  test("원시값/null JSON 이면 null 을 반환한다", () => {
    storage.setItem(sessionKey("num"), JSON.stringify(42));
    storage.setItem(sessionKey("nul"), JSON.stringify(null));
    storage.setItem(sessionKey("str"), JSON.stringify("just-a-string"));
    expect(loadSession("num", storage)).toBeNull();
    expect(loadSession("nul", storage)).toBeNull();
    expect(loadSession("str", storage)).toBeNull();
  });

  test("객체이지만 모든 필드가 없는 빈 객체는 전부 기본값으로 폴백한다", () => {
    storage.setItem(sessionKey("empty"), JSON.stringify({}));
    const restored = loadSession("empty", storage);
    expect(restored).not.toBeNull();
    expect(restored!.sessionId).toBe("");
    expect(restored!.stage).toBe("input");
    expect(restored!.mode).toBe("socratic");
    expect(restored!.estimatedLevel).toBeNull();
  });

  test("손상 세션 로드 실패가 다른 정상 세션 로드에 영향을 주지 않는다", () => {
    persistSession(fullState(), storage); // 정상 세션 s-load
    storage.setItem(sessionKey("corrupt"), "<<broken>>");
    expect(loadSession("corrupt", storage)).toBeNull();
    expect(loadSession("s-load", storage)).toEqual({ ...fullState(), fieldUpdatedAt: {} });
  });
});
