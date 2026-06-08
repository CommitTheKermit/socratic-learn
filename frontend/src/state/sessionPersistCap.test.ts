import { beforeEach, describe, expect, test } from "vitest";
import {
  MAX_SESSIONS,
  SESSION_KEY_PREFIX,
  isQuotaExceeded,
  persistSession,
  sessionKey,
} from "./sessionPersist";
import type { SessionState } from "./sessionState";

/** 본문 캐시 키(SESSION_KEY_PREFIX)들에서 sessionId 목록을 뽑는다(목록 인덱스 제거 후 검증용). */
function cachedIds(store: Map<string, string>): string[] {
  return [...store.keys()]
    .filter((k) => k.startsWith(SESSION_KEY_PREFIX))
    .map((k) => k.slice(SESSION_KEY_PREFIX.length));
}

/**
 * 테스트용 storage. setItem 에 quota 시뮬레이션 훅을 제공한다.
 * - `quotaOnce` 를 특정 키에 대해 true 로 두면 첫 setItem 만 throw 하고 다음부터 정상 동작.
 */
function createStorage() {
  const store = new Map<string, string>();
  const quotaOnce = new Set<string>(); // setItem 시 1회만 quota throw 할 키들
  return {
    store,
    quotaOnce,
    storage: {
      get length() {
        return store.size;
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        if (quotaOnce.has(k)) {
          quotaOnce.delete(k);
          const e = new Error("Quota exceeded");
          e.name = "QuotaExceededError";
          throw e;
        }
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    } as Storage,
  };
}

function state(id: string, createdAt: number, over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: id,
    createdAt,
    conceptSummary: `c-${id}`,
    stage: "input",
    depth: "0depth",
    concept: "",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...over,
  };
}

describe("isQuotaExceeded", () => {
  test("name 이 QuotaExceededError 인 Error 는 true", () => {
    const e = new Error("over");
    e.name = "QuotaExceededError";
    expect(isQuotaExceeded(e)).toBe(true);
  });
  test("Firefox 의 NS_ERROR_DOM_QUOTA_REACHED 도 true", () => {
    const e = new Error("over");
    e.name = "NS_ERROR_DOM_QUOTA_REACHED";
    expect(isQuotaExceeded(e)).toBe(true);
  });
  test("code 22 (구 Safari) 도 true", () => {
    const e = Object.assign(new Error("over"), { code: 22 });
    expect(isQuotaExceeded(e)).toBe(true);
  });
  test("일반 Error 는 false", () => {
    expect(isQuotaExceeded(new Error("?"))).toBe(false);
  });
  test("Error 가 아닌 값도 false", () => {
    expect(isQuotaExceeded("err")).toBe(false);
    expect(isQuotaExceeded(null)).toBe(false);
  });
});

describe("persistSession 세션 수 상한 (MAX_SESSIONS=20)", () => {
  let ctx: ReturnType<typeof createStorage>;
  beforeEach(() => {
    ctx = createStorage();
  });

  test("MAX_SESSIONS 까지는 모두 보관된다", () => {
    for (let i = 0; i < MAX_SESSIONS; i += 1) {
      persistSession(state(`s${i}`, i + 1), ctx.storage);
    }
    expect(cachedIds(ctx.store)).toHaveLength(MAX_SESSIONS);
  });

  test("MAX_SESSIONS 초과 시 가장 오래된 비활성 세션이 evict 된다", () => {
    // 1~20 까지 저장 (createdAt 오름차순으로 1, 2, ..., 20)
    for (let i = 0; i < MAX_SESSIONS; i += 1) {
      persistSession(state(`s${i}`, i + 1), ctx.storage);
    }
    // 21번째(활성). createdAt 최신. s0 (가장 오래된 비활성) 이 evict 되어야 함.
    persistSession(state("active", 9999), ctx.storage);

    const ids = cachedIds(ctx.store);
    expect(ids).toHaveLength(MAX_SESSIONS);
    expect(ids).not.toContain("s0");
    expect(ids).toContain("active");
    // 본문 키도 함께 제거
    expect(ctx.store.has(sessionKey("s0"))).toBe(false);
  });

  test("활성 세션이 가장 오래된 세션이면 건너뛰고 다음 오래된 세션이 evict", () => {
    // active 가 createdAt=1 (가장 오래됨)
    persistSession(state("active", 1), ctx.storage);
    for (let i = 0; i < MAX_SESSIONS; i += 1) {
      persistSession(state(`s${i}`, i + 100), ctx.storage);
    }
    // 본문 캐시는 active + s0..s19 = 21개. cap 초과 → 마지막 저장의 활성은 s19 라 보호되고,
    // 가장 오래된 비활성인 active 가 evict 된다.
    const ids = cachedIds(ctx.store);
    expect(ids).toHaveLength(MAX_SESSIONS);
    expect(ids).not.toContain("active");
  });

  test("활성 세션이 다시 저장될 때 보호되어 evict 되지 않는다", () => {
    // active 를 먼저 만들고 createdAt 도 가장 오래됨
    persistSession(state("active", 1), ctx.storage);
    for (let i = 0; i < MAX_SESSIONS - 1; i += 1) {
      persistSession(state(`s${i}`, i + 100), ctx.storage);
    }
    // 지금 본문 캐시 = 20개. active 를 다시 persist (활성 유지)
    persistSession(state("active", 1, { stage: "probe" }), ctx.storage);

    const ids = cachedIds(ctx.store);
    expect(ids).toHaveLength(MAX_SESSIONS);
    expect(ids).toContain("active");
  });
});

describe("persistSession QuotaExceededError 처리", () => {
  let ctx: ReturnType<typeof createStorage>;
  beforeEach(() => {
    ctx = createStorage();
  });

  test("Quota 발생 시 가장 오래된 비활성 1건 evict 후 재시도해 성공한다", () => {
    persistSession(state("old", 1), ctx.storage);
    persistSession(state("mid", 2), ctx.storage);
    // 다음 setItem(sessionKey("new")) 첫 호출만 Quota throw
    ctx.quotaOnce.add(sessionKey("new"));

    expect(() => persistSession(state("new", 3), ctx.storage)).not.toThrow();
    // old(가장 오래된 비활성)가 evict 되어야 함. new 는 정상 저장.
    expect(ctx.store.has(sessionKey("old"))).toBe(false);
    expect(ctx.store.has(sessionKey("new"))).toBe(true);
    const ids = cachedIds(ctx.store);
    expect(ids).not.toContain("old");
    expect(ids).toContain("new");
    expect(ids).toContain("mid");
  });

  test("evict 할 비활성 세션이 없으면 throw 한다", () => {
    ctx.quotaOnce.add(sessionKey("solo"));
    expect(() => persistSession(state("solo", 1), ctx.storage)).toThrow();
    // 본문 저장 실패했으므로 깨끗.
    expect(ctx.store.has(sessionKey("solo"))).toBe(false);
  });
});
