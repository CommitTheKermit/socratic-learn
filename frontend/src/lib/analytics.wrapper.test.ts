/**
 * createAnalyticsWrapper(enabled) 팩토리 단위 테스트.
 *
 * enabled=false → 모든 emit 이 no-op(호출 횟수 0).
 * enabled=true  → Firebase logEvent/setUserId 로 실제 위임.
 *
 * vi.resetModules + vi.doMock 패턴으로 vitest.setup.ts 전역 mock 을 우회하고
 * Firebase SDK spy 를 주입한다.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ─── 공유 spy ────────────────────────────────────────────
const mockFirebaseLogEvent = vi.fn();
const mockFirebaseSetUserId = vi.fn();
const analyticsStub = { _stub: "analytics" };

// ─── 헬퍼: 모듈 리셋 + doMock 후 실제 createAnalyticsWrapper 로드 ──
async function loadWrapper(analyticsInstance: unknown) {
  vi.resetModules();

  vi.doMock("firebase/analytics", () => ({
    logEvent: mockFirebaseLogEvent,
    setUserId: mockFirebaseSetUserId,
    getAnalytics: vi.fn(() => analyticsInstance),
  }));

  vi.doMock("./firebase", () => ({
    analytics: analyticsInstance,
    auth: { currentUser: null },
    app: {},
    githubProvider: {},
  }));

  const mod = await vi.importActual<typeof import("./analytics")>("./analytics");
  return mod.createAnalyticsWrapper;
}

// ─────────────────────────────────────────────────────────
// enabled=false: 완전한 no-op
// ─────────────────────────────────────────────────────────
describe("createAnalyticsWrapper(false) - no-op 경로", () => {
  beforeEach(() => {
    mockFirebaseLogEvent.mockReset();
    mockFirebaseSetUserId.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("logEvent 호출 시 Firebase logEvent 를 호출하지 않음", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(false);

    wrapper.logEvent("sl_session_start", {
      session_id: "sess-no-op",
      concept: "TypeScript",
      mode: "socratic",
    });

    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });

  it("setUserId 호출 시 Firebase setUserId 를 호출하지 않음", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(false);

    wrapper.setUserId("uid-abc");

    expect(mockFirebaseSetUserId).not.toHaveBeenCalled();
  });

  it("모든 7개 이벤트 타입 호출 시 전부 no-op(총 호출 횟수 0)", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(false);

    wrapper.logEvent("sl_session_start", { session_id: "s", concept: "c", mode: "light" });
    wrapper.logEvent("sl_stage_enter", { session_id: "s", stage: "learn" });
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

    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });

  it("반환값이 undefined 이어서 예외 없이 실행됨", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(false);

    expect(() =>
      wrapper.logEvent("sl_stage_enter", { session_id: "s", stage: "done" }),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────
// enabled=true: Firebase SDK 로 위임
// ─────────────────────────────────────────────────────────
describe("createAnalyticsWrapper(true) - 위임 경로", () => {
  beforeEach(() => {
    mockFirebaseLogEvent.mockReset();
    mockFirebaseSetUserId.mockReset();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("logEvent 호출 시 Firebase logEvent 로 이벤트명+파라미터 위임", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(true);

    wrapper.logEvent("sl_session_start", {
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

  it("sl_stage_enter - stage=done 완료 마커 위임", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(true);

    wrapper.logEvent("sl_stage_enter", { session_id: "sess-002", stage: "done" });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_stage_enter",
      { session_id: "sess-002", stage: "done" },
    );
  });

  it("sl_step_navigate - from/to/direction 위임", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(true);

    wrapper.logEvent("sl_step_navigate", {
      session_id: "sess-003",
      from_idx: 2,
      to_idx: 3,
      direction: "next",
    });

    expect(mockFirebaseLogEvent).toHaveBeenCalledWith(
      analyticsStub,
      "sl_step_navigate",
      { session_id: "sess-003", from_idx: 2, to_idx: 3, direction: "next" },
    );
  });

  it("setUserId(uid) - Firebase setUserId 로 uid 위임", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(true);

    wrapper.setUserId("user-xyz");

    expect(mockFirebaseSetUserId).toHaveBeenCalledOnce();
    expect(mockFirebaseSetUserId).toHaveBeenCalledWith(analyticsStub, "user-xyz");
  });

  it("setUserId(null) - null 을 빈 문자열로 대체하여 위임", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(true);

    wrapper.setUserId(null);

    expect(mockFirebaseSetUserId).toHaveBeenCalledWith(analyticsStub, "");
  });

  it("analytics=null 이면 enabled=true 여도 graceful no-op(크래시 없음)", async () => {
    const createAnalyticsWrapper = await loadWrapper(null); // analytics=null
    const wrapper = createAnalyticsWrapper(true);

    expect(() =>
      wrapper.logEvent("sl_session_start", {
        session_id: "s",
        concept: "c",
        mode: "deep",
      }),
    ).not.toThrow();
    expect(mockFirebaseLogEvent).not.toHaveBeenCalled();
  });

  it("연속 호출 시 각 이벤트마다 Firebase logEvent 가 1회씩 호출됨", async () => {
    const createAnalyticsWrapper = await loadWrapper(analyticsStub);
    const wrapper = createAnalyticsWrapper(true);

    wrapper.logEvent("sl_step_enter", { session_id: "s", step_idx: 0 });
    wrapper.logEvent("sl_step_enter", { session_id: "s", step_idx: 1 });
    wrapper.logEvent("sl_answer_submit", { session_id: "s", step_idx: 1, question_id: "q1" });

    expect(mockFirebaseLogEvent).toHaveBeenCalledTimes(3);
  });
});
