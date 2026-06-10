/**
 * isAnalyticsEnabled() 게이팅 로직 단위 테스트.
 *
 * 세 조건(DEV, VITE_API_BASE_URL localhost/127.0.0.1, VITE_E2E_AUTO_SIGNIN)별로
 * false 반환 케이스와 true 반환 케이스를 검증한다.
 *
 * isAnalyticsEnabled() 는 호출 시점에 env 를 읽으므로
 * vi.stubEnv 만으로 각 조합을 테스트할 수 있다(모듈 리로드 불필요).
 */
import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

// ─── 실제 analytics 모듈 로드(전역 no-op mock 우회) ──────────────
// vitest.setup.ts 가 analytics 를 전역 vi.mock 으로 대체하므로
// vi.resetModules() + vi.importActual() 로 실제 구현을 가져온다.
let isAnalyticsEnabled: () => boolean;

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
  isAnalyticsEnabled = mod.isAnalyticsEnabled;
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─────────────────────────────────────────────────────────
// DEV 플래그 검증
// ─────────────────────────────────────────────────────────
describe("isAnalyticsEnabled - DEV 플래그", () => {
  it("DEV=true → false (개발 환경은 항상 비활성)", () => {
    vi.stubEnv("DEV", true as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://production-api.example.com");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("DEV=false → 다른 조건에 따라 활성/비활성 결정됨", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://production-api.example.com");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// VITE_API_BASE_URL localhost/127.0.0.1 포함 검증
// ─────────────────────────────────────────────────────────
describe("isAnalyticsEnabled - VITE_API_BASE_URL 로컬 에뮬레이터 감지", () => {
  it("VITE_API_BASE_URL이 localhost 포함 → false (로컬 환경)", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/project/region");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("VITE_API_BASE_URL이 127.0.0.1 포함 → false (로컬 에뮬레이터)", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:5001/project/region");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("VITE_API_BASE_URL이 프로덕션 URL → false 아님(다른 조건에 따라)", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://us-central1-socratic-learn-web.cloudfunctions.net");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it("VITE_API_BASE_URL이 설정되지 않음(undefined) → localhost 미포함으로 처리", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", undefined as unknown as string);
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// VITE_E2E_AUTO_SIGNIN 검증
// ─────────────────────────────────────────────────────────
describe("isAnalyticsEnabled - VITE_E2E_AUTO_SIGNIN", () => {
  it("VITE_E2E_AUTO_SIGNIN='true' → false (E2E 자동 로그인 환경)", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://production-api.example.com");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "true");
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("VITE_E2E_AUTO_SIGNIN='' → E2E 비활성으로 처리", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://production-api.example.com");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it("VITE_E2E_AUTO_SIGNIN='false' → 'true' 아님이므로 E2E 비활성으로 처리", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://production-api.example.com");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "false");
    expect(isAnalyticsEnabled()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// 활성(true) 케이스: 세 조건 모두 false 일 때만
// ─────────────────────────────────────────────────────────
describe("isAnalyticsEnabled - 활성 케이스(프로덕션)", () => {
  it("DEV=false, API_BASE_URL=프로덕션, E2E 없음 → true (유일한 활성 조합)", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://us-central1-socratic-learn-web.cloudfunctions.net");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────
// 복합 케이스: 여러 조건 동시 활성
// ─────────────────────────────────────────────────────────
describe("isAnalyticsEnabled - 복합 비활성 케이스", () => {
  it("DEV=true + localhost URL + E2E → false", () => {
    vi.stubEnv("DEV", true as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/project/region");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "true");
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("DEV=false + localhost URL + E2E → false (URL 조건만으로 충분)", () => {
    vi.stubEnv("DEV", false as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:5001/project/region");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "true");
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("DEV=true + 프로덕션 URL + E2E 없음 → false (DEV 조건만으로 충분)", () => {
    vi.stubEnv("DEV", true as unknown as string);
    vi.stubEnv("VITE_API_BASE_URL", "https://production-api.example.com");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
    expect(isAnalyticsEnabled()).toBe(false);
  });
});
