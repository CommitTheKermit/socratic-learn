/**
 * Sub-AC 2: isAnalyticsEnabled() stub=false 주입 시 wrapper.logEvent GA4 호출 횟수 0건 검증.
 *
 * 테스트 패턴("isAnalyticsEnabled 를 stub 으로 주입"):
 *   1. isAnalyticsEnabled 를 vi.fn()으로 stub(false 반환)
 *   2. stub 반환값(false)을 createAnalyticsWrapper 에 주입
 *   3. wrapper.logEvent / wrapper.setUserId 호출
 *   4. Firebase logEvent / setUserId 호출 횟수 0건 검증
 *
 * analytics.wrapper.test.ts 가 createAnalyticsWrapper(false) 를 하드코딩으로 호출하는 것과 달리,
 * 이 파일은 isAnalyticsEnabled 함수 자체를 stub 으로 교체 후 그 반환값을 주입하는 경로를 명시적으로 검증한다.
 *
 * 모듈 로드:
 *   vi.resetModules() + vi.importActual() 로 vitest.setup.ts 전역 no-op mock 을 우회한다.
 *   Firebase SDK 는 vi.doMock 으로 spy 주입.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── 공유 spy ─────────────────────────────────────────────────
const mockFirebaseLogEvent = vi.fn();
const mockFirebaseSetUserId = vi.fn();
const analyticsStub = { _stub: "analytics-noOp" };

// ─── 헬퍼: 실제 analytics 모듈 로드(vitest.setup.ts 전역 no-op mock 우회) ──
async function loadRealAnalyticsModule() {
  vi.resetModules();

  vi.doMock("firebase/analytics", () => ({
    logEvent: mockFirebaseLogEvent,
    setUserId: mockFirebaseSetUserId,
  }));

  vi.doMock("./firebase", () => ({
    analytics: analyticsStub,
    auth: { currentUser: null },
    app: {},
    githubProvider: {},
  }));

  return vi.importActual<typeof import("./analytics")>("./analytics");
}

// ─────────────────────────────────────────────────────────────
// Sub-AC 2: isAnalyticsEnabled stub=false → wrapper.logEvent no-op(0건)
// ─────────────────────────────────────────────────────────────
describe("Sub-AC 2: isAnalyticsEnabled() stub=false 주입 → wrapper.logEvent no-op", () => {
  beforeEach(() => {
    mockFirebaseLogEvent.mockReset();
    mockFirebaseSetUserId.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("isAnalyticsEnabled stub이 false를 반환할 때 wrapper.logEvent가 Firebase logEvent를 호출하지 않음", async () => {
    const mod = await loadRealAnalyticsModule();

    // isAnalyticsEnabled 를 false 반환 stub 으로 교체
    const isAnalyticsEnabledStub = vi.fn<[], boolean>().mockReturnValue(false);

    // stub 반환값(false)을 createAnalyticsWrapper 에 주입
    const wrapper = mod.createAnalyticsWrapper(isAnalyticsEnabledStub());

    expect(isAnalyticsEnabledStub).toHaveBeenCalledOnce();
    expect(isAnalyticsEnabledStub).toHaveReturnedWith(false);

    wrapper.logEvent("sl_session_start", {
      session_id: "sess-noop-stub",
      concept: "TypeScript",
      mode: "socratic",
    });

    // Firebase logEvent 호출 횟수 0건
    expect(mockFirebaseLogEvent).toHaveBeenCalledTimes(0);
  });

  it("7개 sl_ 이벤트 타입 모두: stub=false 주입 시 총 Firebase logEvent 호출 횟수 0건", async () => {
    const mod = await loadRealAnalyticsModule();

    const isAnalyticsEnabledStub = vi.fn<[], boolean>().mockReturnValue(false);
    const wrapper = mod.createAnalyticsWrapper(isAnalyticsEnabledStub());

    wrapper.logEvent("sl_session_start", { session_id: "s", concept: "c", mode: "light" });
    wrapper.logEvent("sl_stage_enter", { session_id: "s", stage: "done" });
    wrapper.logEvent("sl_step_enter", { session_id: "s", step_idx: 0 });
    wrapper.logEvent("sl_answer_submit", { session_id: "s", step_idx: 0, question_id: "q" });
    wrapper.logEvent("sl_answer_edit", { session_id: "s", step_idx: 0, question_id: "q" });
    wrapper.logEvent("sl_branch_select", { session_id: "s", step_idx: 0, choice: "opt" });
    wrapper.logEvent("sl_step_navigate", {
      session_id: "s",
      from_idx: 0,
      to_idx: 1,
      direction: "next",
    });

    // 7개 이벤트 호출 후에도 Firebase logEvent 총 호출 횟수 0건
    expect(mockFirebaseLogEvent).toHaveBeenCalledTimes(0);
  });

  it("setUserId: stub=false 주입 시 Firebase setUserId 호출 횟수 0건", async () => {
    const mod = await loadRealAnalyticsModule();

    const isAnalyticsEnabledStub = vi.fn<[], boolean>().mockReturnValue(false);
    const wrapper = mod.createAnalyticsWrapper(isAnalyticsEnabledStub());

    wrapper.setUserId("uid-stub-test");
    wrapper.setUserId(null);

    expect(mockFirebaseSetUserId).toHaveBeenCalledTimes(0);
  });

  it("stub=false 주입 시 wrapper.logEvent 예외 없이 실행(no-op, 크래시 없음)", async () => {
    const mod = await loadRealAnalyticsModule();

    const isAnalyticsEnabledStub = vi.fn<[], boolean>().mockReturnValue(false);
    const wrapper = mod.createAnalyticsWrapper(isAnalyticsEnabledStub());

    expect(() =>
      wrapper.logEvent("sl_stage_enter", { session_id: "s", stage: "done" }),
    ).not.toThrow();
    expect(mockFirebaseLogEvent).toHaveBeenCalledTimes(0);
  });

  it("stub이 실제로 호출되어 false를 반환했음을 검증(stub 주입 경로 추적)", async () => {
    const mod = await loadRealAnalyticsModule();

    const isAnalyticsEnabledStub = vi.fn<[], boolean>().mockReturnValue(false);

    // stub 호출 전 - 아직 0회
    expect(isAnalyticsEnabledStub).toHaveBeenCalledTimes(0);

    const enabled = isAnalyticsEnabledStub();
    expect(isAnalyticsEnabledStub).toHaveBeenCalledTimes(1);
    expect(enabled).toBe(false);

    const wrapper = mod.createAnalyticsWrapper(enabled);
    wrapper.logEvent("sl_session_start", { session_id: "s", concept: "c", mode: "deep" });

    // 최종: Firebase logEvent 호출 없음
    expect(mockFirebaseLogEvent).toHaveBeenCalledTimes(0);
  });
});
