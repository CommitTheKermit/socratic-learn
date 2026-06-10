/**
 * initAnalytics() graceful degradation 테스트.
 *
 * Sub-AC 6-1: measurementId 가 undefined/빈 문자열일 때
 * initAnalytics() 함수가 예외를 던지지 않고 null 을 반환한다.
 *
 * vi.resetModules() + vi.doMock 패턴으로 실제 firebase.ts 코드를 로드하되
 * firebase SDK 의존성은 stub 으로 대체한다.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── SDK 스텁 ────────────────────────────────────────────────
const mockGetAnalytics = vi.fn();
const mockGetAuth = vi.fn().mockReturnValue({ currentUser: null });
const mockInitializeApp = vi.fn().mockReturnValue({ name: "test-app" });

async function loadFirebase() {
  vi.resetModules();

  vi.doMock("firebase/app", () => ({
    initializeApp: mockInitializeApp,
  }));
  vi.doMock("firebase/auth", () => ({
    getAuth: mockGetAuth,
    GithubAuthProvider: vi.fn().mockImplementation(() => ({})),
    connectAuthEmulator: vi.fn(),
  }));
  vi.doMock("firebase/analytics", () => ({
    getAnalytics: mockGetAnalytics,
  }));

  return vi.importActual<typeof import("./firebase")>("./firebase");
}

describe("initAnalytics - graceful degradation", () => {
  beforeEach(() => {
    mockGetAnalytics.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  // ── undefined ────────────────────────────────────────────────
  it("measurementId 가 undefined 이면 예외 없이 null 반환", async () => {
    const { initAnalytics } = await loadFirebase();
    const appStub = { name: "test" } as ReturnType<typeof mockInitializeApp>;

    let result: unknown;
    expect(() => {
      result = initAnalytics(appStub, undefined);
    }).not.toThrow();
    expect(result).toBeNull();
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  // ── 빈 문자열 ────────────────────────────────────────────────
  it("measurementId 가 빈 문자열이면 예외 없이 null 반환", async () => {
    const { initAnalytics } = await loadFirebase();
    const appStub = { name: "test" } as ReturnType<typeof mockInitializeApp>;

    let result: unknown;
    expect(() => {
      result = initAnalytics(appStub, "");
    }).not.toThrow();
    expect(result).toBeNull();
    expect(mockGetAnalytics).not.toHaveBeenCalled();
  });

  // ── 유효 measurementId → Analytics 반환 ─────────────────────
  it("measurementId 가 유효하면 getAnalytics 결과를 반환", async () => {
    const analyticsStub = { _stub: true };
    mockGetAnalytics.mockReturnValue(analyticsStub);

    const { initAnalytics } = await loadFirebase();
    const appStub = { name: "test" } as ReturnType<typeof mockInitializeApp>;

    const result = initAnalytics(appStub, "G-TESTID");
    expect(result).toBe(analyticsStub);
    expect(mockGetAnalytics).toHaveBeenCalledWith(appStub);
  });

  // ── getAnalytics 가 예외를 던져도 앱 크래시 없음 ────────────
  it("getAnalytics 가 예외를 던져도 null 반환(앱 크래시 없음)", async () => {
    mockGetAnalytics.mockImplementation(() => {
      throw new Error("analytics init failed");
    });

    const { initAnalytics } = await loadFirebase();
    const appStub = { name: "test" } as ReturnType<typeof mockInitializeApp>;

    let result: unknown;
    expect(() => {
      result = initAnalytics(appStub, "G-TESTID");
    }).not.toThrow();
    expect(result).toBeNull();
  });
});
