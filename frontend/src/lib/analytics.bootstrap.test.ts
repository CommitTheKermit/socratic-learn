/**
 * Sub-AC 3c-1: 진입점 게이팅 주입 검증.
 *
 * analyticsBootstrap.ts 가 isInstrumentationEnabled() 반환값을
 * createAnalyticsWrapper 에 올바르게 주입하는지 검증한다.
 *
 * 두 케이스:
 *   - enabled: PROD=true, emulator/E2E 없음 → createAnalyticsWrapper(true)
 *   - disabled: PROD=false → createAnalyticsWrapper(false)
 *
 * 전략:
 *   - vi.resetModules() + vi.importActual 패턴(analytics.logEvent.test.ts 와 동일)으로
 *     vitest.setup.ts 의 전역 no-op mock 을 우회한다.
 *   - isInstrumentationEnabled 는 실제 구현을 사용(env 스텁 기반 검증).
 *   - createAnalyticsWrapper 는 spy 로 교체해 호출 인자를 캡처한다.
 */
import { vi, describe, it, expect, afterEach } from "vitest";

// ─── 공유 spy ────────────────────────────────────────────────
const mockCreateWrapper = vi.fn(() => ({ logEvent: vi.fn(), setUserId: vi.fn() }));

/**
 * 모듈 캐시를 비우고 Firebase 의존성을 stub 한 뒤
 * - 실제 isInstrumentationEnabled (env 를 호출 시점에 읽음)
 * - spy createAnalyticsWrapper
 * 를 주입한 analyticsBootstrap 모듈을 반환한다.
 */
async function loadBootstrap() {
  mockCreateWrapper.mockClear();
  vi.resetModules();

  // Firebase SDK dep - jsdom 환경에서 크래시 방지
  vi.doMock("firebase/analytics", () => ({
    logEvent: vi.fn(),
    setUserId: vi.fn(),
  }));

  // lib/firebase stub - analytics 인스턴스 null(게이팅 검증에 불필요)
  vi.doMock("./firebase", () => ({
    analytics: null,
    auth: { currentUser: null },
    app: {},
    githubProvider: {},
  }));

  // analytics.ts 실제 코드 로드(전역 mock 우회).
  // isInstrumentationEnabled 는 import.meta.env 를 호출 시점에 읽으므로
  // vi.stubEnv 로 언제든 제어 가능.
  const actual = await vi.importActual<typeof import("./analytics")>("./analytics");

  // analytics 모듈: isInstrumentationEnabled 는 실제 구현, createAnalyticsWrapper 는 spy
  vi.doMock("./analytics", () => ({
    isInstrumentationEnabled: actual.isInstrumentationEnabled,
    createAnalyticsWrapper: mockCreateWrapper,
  }));

  // bootstrapAnalytics 모듈은 fresh import (doMock 된 analytics 사용)
  return import("./analyticsBootstrap");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

// ─────────────────────────────────────────────────────────────
// enabled case: PROD=true, emulator/E2E 없음
// ─────────────────────────────────────────────────────────────
describe("bootstrapAnalytics - enabled(production) 케이스", () => {
  it(
    "PROD=true, VITE_AUTH_EMULATOR_URL='', VITE_E2E_AUTO_SIGNIN='' → createAnalyticsWrapper(true) 호출",
    async () => {
      vi.stubEnv("PROD", true as unknown as string);
      vi.stubEnv("VITE_AUTH_EMULATOR_URL", "");
      vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");

      const { bootstrapAnalytics } = await loadBootstrap();
      bootstrapAnalytics();

      expect(mockCreateWrapper).toHaveBeenCalledOnce();
      expect(mockCreateWrapper).toHaveBeenCalledWith(true);
    },
  );

  it("bootstrapAnalytics 반환값이 wrapper 객체(logEvent/setUserId 보유)", async () => {
    vi.stubEnv("PROD", true as unknown as string);
    vi.stubEnv("VITE_AUTH_EMULATOR_URL", "");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");

    const { bootstrapAnalytics } = await loadBootstrap();
    const wrapper = bootstrapAnalytics();

    expect(wrapper).toBeDefined();
    expect(typeof wrapper.logEvent).toBe("function");
    expect(typeof wrapper.setUserId).toBe("function");
  });
});

// ─────────────────────────────────────────────────────────────
// disabled case: dev/emulator/E2E 환경
// ─────────────────────────────────────────────────────────────
describe("bootstrapAnalytics - disabled(non-production) 케이스", () => {
  it("PROD=false → createAnalyticsWrapper(false) 호출", async () => {
    vi.stubEnv("PROD", false as unknown as string);
    vi.stubEnv("VITE_AUTH_EMULATOR_URL", "");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");

    const { bootstrapAnalytics } = await loadBootstrap();
    bootstrapAnalytics();

    expect(mockCreateWrapper).toHaveBeenCalledOnce();
    expect(mockCreateWrapper).toHaveBeenCalledWith(false);
  });

  it("PROD=true, VITE_AUTH_EMULATOR_URL 있음 → createAnalyticsWrapper(false) 호출", async () => {
    vi.stubEnv("PROD", true as unknown as string);
    vi.stubEnv("VITE_AUTH_EMULATOR_URL", "http://127.0.0.1:9099");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");

    const { bootstrapAnalytics } = await loadBootstrap();
    bootstrapAnalytics();

    expect(mockCreateWrapper).toHaveBeenCalledOnce();
    expect(mockCreateWrapper).toHaveBeenCalledWith(false);
  });

  it("PROD=true, VITE_E2E_AUTO_SIGNIN 있음 → createAnalyticsWrapper(false) 호출", async () => {
    vi.stubEnv("PROD", true as unknown as string);
    vi.stubEnv("VITE_AUTH_EMULATOR_URL", "");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "true");

    const { bootstrapAnalytics } = await loadBootstrap();
    bootstrapAnalytics();

    expect(mockCreateWrapper).toHaveBeenCalledOnce();
    expect(mockCreateWrapper).toHaveBeenCalledWith(false);
  });
});
