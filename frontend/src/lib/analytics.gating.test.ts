/**
 * isInstrumentationEnabled() 게이팅 로직 단위 테스트.
 *
 * 세 env 플래그(PROD, VITE_AUTH_EMULATOR_URL, VITE_E2E_AUTO_SIGNIN)의
 * 모든 조합(2^3 = 8가지)을 검증한다.
 *
 * isInstrumentationEnabled() 는 호출 시점에 env 를 읽으므로
 * vi.stubEnv 만으로 각 조합을 테스트할 수 있다(모듈 리로드 불필요).
 */
import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

// ─── 실제 analytics 모듈 로드(전역 no-op mock 우회) ──────────────
// vitest.setup.ts 가 analytics 를 전역 vi.mock 으로 대체하므로
// vi.resetModules() + vi.importActual() 로 실제 구현을 가져온다.
let isInstrumentationEnabled: () => boolean;

beforeAll(async () => {
  vi.resetModules();

  // analytics.ts 의 firebase 의존성을 stub(getAuth 크래시 방지)
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

  const mod = await vi.importActual<typeof import("./analytics")>("./analytics");
  isInstrumentationEnabled = mod.isInstrumentationEnabled;
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// 헬퍼: 세 플래그를 한 번에 stub
function stubEnvFlags(prod: boolean, emulatorUrl: string, e2e: string) {
  vi.stubEnv("PROD", prod as unknown as string);
  vi.stubEnv("VITE_AUTH_EMULATOR_URL", emulatorUrl);
  vi.stubEnv("VITE_E2E_AUTO_SIGNIN", e2e);
}

// ─────────────────────────────────────────────────────────
// 8가지 조합: PROD x EMULATOR x E2E
// 세 조건 AND → PROD=true & emulator="" & E2E="" 만 true
// ─────────────────────────────────────────────────────────
describe("isInstrumentationEnabled - 8가지 환경 조합", () => {
  // ── 활성(true) 케이스: 오직 1가지 ────────────────────────
  it("PROD=true, emulator='', E2E='' → true (유일한 활성 조합)", () => {
    stubEnvFlags(true, "", "");
    expect(isInstrumentationEnabled()).toBe(true);
  });

  // ── 비활성(false) 케이스: 나머지 7가지 ──────────────────
  it("PROD=true, emulator='http://...', E2E='' → false (emulator 활성)", () => {
    stubEnvFlags(true, "http://127.0.0.1:9099", "");
    expect(isInstrumentationEnabled()).toBe(false);
  });

  it("PROD=true, emulator='', E2E='true' → false (E2E 활성)", () => {
    stubEnvFlags(true, "", "true");
    expect(isInstrumentationEnabled()).toBe(false);
  });

  it("PROD=true, emulator='http://...', E2E='true' → false (emulator+E2E 모두 활성)", () => {
    stubEnvFlags(true, "http://127.0.0.1:9099", "true");
    expect(isInstrumentationEnabled()).toBe(false);
  });

  it("PROD=false, emulator='', E2E='' → false (dev 빌드)", () => {
    stubEnvFlags(false, "", "");
    expect(isInstrumentationEnabled()).toBe(false);
  });

  it("PROD=false, emulator='http://...', E2E='' → false (dev + emulator)", () => {
    stubEnvFlags(false, "http://127.0.0.1:9099", "");
    expect(isInstrumentationEnabled()).toBe(false);
  });

  it("PROD=false, emulator='', E2E='true' → false (dev + E2E)", () => {
    stubEnvFlags(false, "", "true");
    expect(isInstrumentationEnabled()).toBe(false);
  });

  it("PROD=false, emulator='http://...', E2E='true' → false (dev + emulator + E2E)", () => {
    stubEnvFlags(false, "http://127.0.0.1:9099", "true");
    expect(isInstrumentationEnabled()).toBe(false);
  });
});
