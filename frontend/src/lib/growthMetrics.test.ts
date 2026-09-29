import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureCampaign, getCampaign, trackFirstFeedbackView, trackStartAttempt, trackStartFailure } from "./growthMetrics";
import { isInstrumentationEnabled, logEvent } from "./analytics";

beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks(); vi.mocked(isInstrumentationEnabled).mockReturnValue(true); });

describe("홍보 유입과 첫 피드백 체험", () => {
  it("SNS 유입을 같은 탭의 홈 이동과 시작까지 유지한다", () => {
    captureCampaign("?utm_source=threads&utm_medium=organic_social&utm_campaign=relaunch_202609&utm_content=question_01");
    captureCampaign("");
    trackStartAttempt("concept");
    expect(logEvent).toHaveBeenCalledWith("sl_start_attempt", expect.objectContaining({ campaign_source: "threads", entry_method: "concept" }));
  });
  it("새 캠페인으로 들어오면 그 캠페인으로 바뀐다", () => {
    captureCampaign("?utm_source=threads");
    captureCampaign("?utm_source=linkedin");
    expect(getCampaign().campaign_source).toBe("linkedin");
  });
  it("캠페인이 없는 새 탭은 직접 유입으로 분류한다", () => {
    expect(captureCampaign("").campaign_source).toBe("direct");
  });
  it("임의 URL 값이나 사용자 입력을 커스텀 이벤트에 복사하지 않는다", () => {
    captureCampaign("?utm_source=unknown&utm_campaign=private-note&utm_content=someone@example.com");
    const campaign = getCampaign();
    expect(campaign.campaign_source).toBe("other");
    expect(JSON.stringify(campaign)).not.toContain("private-note");
    expect(JSON.stringify(campaign)).not.toContain("@");
  });
  it("저장소가 손상되어도 학습 시작 측정은 오류를 던지지 않는다", () => {
    sessionStorage.setItem("socratic:growth:campaign:v1", "broken");
    expect(() => trackStartAttempt("roadmap")).not.toThrow();
  });
  it("인증 실패와 로드맵 조회 실패를 구별한다", () => {
    trackStartFailure("concept", "auth");
    trackStartFailure("roadmap", "roadmap_load");
    expect(logEvent).toHaveBeenCalledWith("sl_start_failed", expect.objectContaining({ entry_method: "concept", reason: "auth" }));
    expect(logEvent).toHaveBeenCalledWith("sl_start_failed", expect.objectContaining({ entry_method: "roadmap", reason: "roadmap_load" }));
  });
  it("같은 학습의 재열람과 다음 질문으로 첫 경험을 중복 계산하지 않는다", () => {
    trackFirstFeedbackView("s1", 0);
    trackFirstFeedbackView("s1", 1);
    trackFirstFeedbackView("s2", 0);
    expect(logEvent).toHaveBeenCalledTimes(2);
  });
  it("개발 환경에서는 체험 이벤트와 중복 방지 기록을 남기지 않는다", () => {
    vi.mocked(isInstrumentationEnabled).mockReturnValue(false);
    trackFirstFeedbackView("s1", 0);
    expect(logEvent).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
  });
});
