/**
 * Sub-AC 3c-2: 단일 인스턴스 export - 싱글턴 동작 검증.
 *
 * analyticsBootstrap 모듈을 여러 번 import해도 동일한 객체 참조가 반환됨을 검증한다.
 * ES 모듈은 최초 평가 후 레지스트리에 캐시되므로 이후 import는 같은 모듈 인스턴스를 반환한다.
 *
 * 검증 항목:
 *   - 모듈 객체 자체가 동일한 참조(mod1 === mod2)
 *   - 모듈 레벨 wrapper 상수가 동일한 참조(mod1.wrapper === mod2.wrapper)
 *   - bootstrapAnalytics() 를 여러 번 호출해도 동일한 참조를 반환
 */
import { vi, describe, it, expect, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// ─────────────────────────────────────────────────────────────
// 헬퍼: 모듈 캐시를 초기화하고 Firebase 의존성을 stub한 뒤
//        첫 번째 import를 실행해 모듈을 캐시에 등록한다.
// ─────────────────────────────────────────────────────────────
async function setupFreshModule() {
  vi.resetModules();

  vi.doMock("firebase/analytics", () => ({
    logEvent: vi.fn(),
    setUserId: vi.fn(),
  }));

  vi.doMock("./firebase", () => ({
    analytics: null,
    auth: { currentUser: null },
    app: {},
    githubProvider: {},
  }));

  // analytics.ts 의존성도 stub(vitest.setup.ts 전역 no-op mock 우회)
  vi.doMock("./analytics", () => ({
    createAnalyticsWrapper: vi.fn(() => ({ logEvent: vi.fn(), setUserId: vi.fn() })),
    isInstrumentationEnabled: vi.fn(() => false),
  }));

  // 첫 번째 import - 모듈이 평가되어 캐시에 등록됨
  const mod1 = await import("./analyticsBootstrap");

  return mod1;
}

// ─────────────────────────────────────────────────────────────
// 싱글턴: 모듈 참조 동일성
// ─────────────────────────────────────────────────────────────
describe("analyticsBootstrap - 싱글턴 export 검증", () => {
  it("동일 경로를 두 번 import하면 같은 모듈 객체 참조를 반환한다", async () => {
    const mod1 = await setupFreshModule();
    // 두 번째 import - 캐시에서 반환(재평가 없음)
    const mod2 = await import("./analyticsBootstrap");

    expect(mod1).toBe(mod2);
  });

  it("mod1.wrapper 와 mod2.wrapper 는 동일한 객체 참조다", async () => {
    const mod1 = await setupFreshModule();
    const mod2 = await import("./analyticsBootstrap");

    expect(mod1.wrapper).toBe(mod2.wrapper);
  });

  it("bootstrapAnalytics() 를 여러 번 호출해도 항상 같은 wrapper 참조를 반환한다", async () => {
    const mod1 = await setupFreshModule();
    const { bootstrapAnalytics } = mod1;

    const result1 = bootstrapAnalytics();
    const result2 = bootstrapAnalytics();
    const result3 = bootstrapAnalytics();

    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it("bootstrapAnalytics() 반환값이 모듈 레벨 wrapper 상수와 동일한 참조다", async () => {
    const mod = await setupFreshModule();

    const result = mod.bootstrapAnalytics();

    expect(result).toBe(mod.wrapper);
  });

  it("wrapper 는 logEvent 와 setUserId 메서드를 가진 객체다", async () => {
    const { wrapper } = await setupFreshModule();

    expect(typeof wrapper.logEvent).toBe("function");
    expect(typeof wrapper.setUserId).toBe("function");
  });
});
