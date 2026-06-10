/**
 * analytics.ts logEvent 래퍼 런타임 검증.
 *
 * vi.resetModules() + vi.importActual() 패턴으로 실제 래퍼 구현을 테스트한다.
 * - vitest.setup.ts 의 전역 analytics mock 을 우회(vi.importActual)
 * - firebase/analytics SDK 는 vi.doMock 으로 캡처
 * - PROD env 를 true 로 스텁해 isActive=true 경로 강제
 *
 * 게이팅 비활성(dev/emulator) 경로도 별도 describe 로 검증한다.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── 공유 spy 선언 ───────────────────────────────────────────
const mockFirebaseLogEvent = vi.fn();
const mockFirebaseSetUserId = vi.fn();
// analytics instance stub - non-null 이어야 래퍼가 진행한다
const analyticsStub = { _stub: true };

// ─── 헬퍼: 모듈 리셋 + doMock 설정 후 실제 analytics 임포트 ──
async function loadRealAnalytics() {
  // vi.resetModules: 모듈 캐시 초기화(setup.ts 의 no-op mock 캐시 제거)
  vi.resetModules();

  // firebase/analytics SDK 를 spy 가 있는 mock 으로 교체
  vi.doMock("firebase/analytics", () => ({
    logEvent: mockFirebaseLogEvent,
    setUserId: mockFirebaseSetUserId,
  }));

  // firebase.ts 를 non-null analytics 인스턴스를 가진 stub 으로 교체
  vi.doMock("./firebase", () => ({
    analytics: analyticsStub,
    auth: { currentUser: null },
    app: {},
    githubProvider: {},
  }));

  // vi.importActual: setup.ts 의 전역 vi.mock("./src/lib/analytics") 를 우회하고
  // analytics.ts 실제 코드를 실행. 의존성(firebase/analytics, ./firebase)은
  // 위에서 설정한 doMock 팩토리를 사용한다.
  return vi.importActual<typeof import("./analytics")>("./analytics");
}

// ─── production 게이팅 활성(isActive=true) ───────────────────
describe("production 환경 - isActive=true", () => {
  beforeEach(() => {
    mockFirebaseLogEvent.mockReset();
    mockFirebaseSetUserId.mockReset();

    // PROD=true, emulator/E2E env 없음 → isActive 계산 시 true
    // vi.stubEnv 는 string 타입이지만 runtime 에 boolean true 를 전달하면
    // import.meta.env.PROD === true 체크를 통과한다
    vi.stubEnv("PROD", true as unknown as string);
    vi.stubEnv("VITE_AUTH_EMULATOR_URL", "");
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // ── sl_session_start ────────────────────────────────────────
  it("sl_session_start: 이벤트명과 파라미터가 Firebase logEvent 로 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_session_start", {
      session_id: "sess-001",
      concept: "TypeScript",
      mode: "socratic",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledOnce();
    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_session_start",
      { session_id: "sess-001", concept: "TypeScript", mode: "socratic" },
    );
  });

  // ── sl_stage_enter ──────────────────────────────────────────
  it("sl_stage_enter: stage=done 이 완료 마커로 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_stage_enter", { session_id: "sess-002", stage: "done" });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_stage_enter",
      { session_id: "sess-002", stage: "done" },
    );
  });

  it("sl_stage_enter: stage=learn 진입 이벤트 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_stage_enter", { session_id: "sess-002", stage: "learn" });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_stage_enter",
      { session_id: "sess-002", stage: "learn" },
    );
  });

  // ── sl_step_enter ───────────────────────────────────────────
  it("sl_step_enter: step_idx 가 파라미터로 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_step_enter", { session_id: "sess-003", step_idx: 2 });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_step_enter",
      { session_id: "sess-003", step_idx: 2 },
    );
  });

  // ── sl_answer_submit ────────────────────────────────────────
  it("sl_answer_submit: step_idx + question_id 가 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_answer_submit", {
      session_id: "sess-004",
      step_idx: 1,
      question_id: "q-abc",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_answer_submit",
      { session_id: "sess-004", step_idx: 1, question_id: "q-abc" },
    );
  });

  // ── sl_answer_edit ──────────────────────────────────────────
  it("sl_answer_edit: step_idx + question_id 가 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_answer_edit", {
      session_id: "sess-005",
      step_idx: 3,
      question_id: "q-xyz",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_answer_edit",
      { session_id: "sess-005", step_idx: 3, question_id: "q-xyz" },
    );
  });

  // ── sl_branch_select ────────────────────────────────────────
  it("sl_branch_select: choice 가 파라미터로 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_branch_select", {
      session_id: "sess-006",
      step_idx: 4,
      choice: "roadmap_next",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_branch_select",
      { session_id: "sess-006", step_idx: 4, choice: "roadmap_next" },
    );
  });

  // ── sl_step_navigate ────────────────────────────────────────
  it("sl_step_navigate: from_idx/to_idx/direction 이 전달됨", async () => {
    const { logEvent } = await loadRealAnalytics();

    logEvent("sl_step_navigate", {
      session_id: "sess-007",
      from_idx: 0,
      to_idx: 1,
      direction: "next",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_step_navigate",
      { session_id: "sess-007", from_idx: 0, to_idx: 1, direction: "next" },
    );
  });

  // ── setAnalyticsUserId ──────────────────────────────────────
  it("setAnalyticsUserId: uid 가 Firebase setUserId 로 전달됨", async () => {
    const { setAnalyticsUserId } = await loadRealAnalytics();

    setAnalyticsUserId("user-abc");

    expect(mockFirebaseSetUserId).toHaveBeenCalledWith(analyticsStub, "user-abc");
  });

  it("setAnalyticsUserId: null 전달 시 빈 문자열로 대체됨", async () => {
    const { setAnalyticsUserId } = await loadRealAnalytics();

    setAnalyticsUserId(null);

    expect(mockFirebaseSetUserId).toHaveBeenCalledWith(analyticsStub, "");
  });
});

// ─── dev/emulator 게이팅 비활성(isActive=false) ──────────────
describe("dev 환경 - isActive=false, no-op 검증", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    mockFirebaseLogEvent.mockReset();
    mockFirebaseSetUserId.mockReset();
  });

  it("PROD=false 이면 logEvent 가 Firebase logEvent 를 호출하지 않음", async () => {
    vi.stubEnv("PROD", false as unknown as string);

    const { logEvent } = await loadRealAnalytics();
    logEvent("sl_session_start", {
      session_id: "s1",
      concept: "TS",
      mode: "light",
    });

    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });

  it("VITE_AUTH_EMULATOR_URL 가 있으면 no-op", async () => {
    vi.stubEnv("PROD", true as unknown as string);
    vi.stubEnv("VITE_AUTH_EMULATOR_URL", "http://127.0.0.1:9099");

    const { logEvent } = await loadRealAnalytics();
    logEvent("sl_step_enter", { session_id: "s1", step_idx: 0 });

    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });

  it("VITE_E2E_AUTO_SIGNIN 가 있으면 no-op", async () => {
    vi.stubEnv("PROD", true as unknown as string);
    vi.stubEnv("VITE_E2E_AUTO_SIGNIN", "true");

    const { logEvent } = await loadRealAnalytics();
    logEvent("sl_step_enter", { session_id: "s1", step_idx: 0 });

    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });
});

// ─── analytics=null 일 때 graceful degradation ───────────────
describe("analytics=null - graceful degradation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    mockFirebaseLogEvent.mockReset();
  });

  it("analytics 인스턴스가 null 이면 앱 크래시 없이 no-op", async () => {
    vi.stubEnv("PROD", true as unknown as string);

    vi.resetModules();
    vi.doMock("firebase/analytics", () => ({
      logEvent: mockFirebaseLogEvent,
      setUserId: mockFirebaseSetUserId,
    }));
    // analytics=null 로 반환
    vi.doMock("./firebase", () => ({
      analytics: null,
      auth: { currentUser: null },
      app: {},
      githubProvider: {},
    }));

    const { logEvent } = await vi.importActual<typeof import("./analytics")>("./analytics");

    // 예외 없이 실행되어야 한다
    expect(() =>
      logEvent("sl_session_start", { session_id: "s1", concept: "TS", mode: "deep" }),
    ).not.toThrow();
    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });
});
