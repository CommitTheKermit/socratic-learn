import { isInstrumentationEnabled, logEvent } from "./analytics";

export type LearningEntryMethod = "concept" | "roadmap";
export interface CampaignAttribution {
  campaign_source: string;
  campaign_medium: string;
  campaign_name: string;
  campaign_content: string;
}

const STORAGE_KEY = "socratic:growth:campaign:v1";
const SOURCES = new Set(["instagram", "linkedin", "threads", "geeknews", "disquiet", "study"]);
const MEDIA = new Set(["organic_social", "community", "paid_social"]);
const CAMPAIGNS = new Set(["relaunch_202609"]);
const CONTENT = new Set(["carousel_01", "demo_01", "story_01", "question_01", "followup_01", "show_01", "invite_01"]);
const DIRECT: CampaignAttribution = {
  campaign_source: "direct", campaign_medium: "none", campaign_name: "none", campaign_content: "none",
};

// URL의 임의 문자열 대신 이번 실험에 정의한 식별자만 집계한다.
// 같은 탭에서는 최신 캠페인을 유지한다. 새 탭의 직접 방문은 이전 캠페인에 귀속하지 않는다.
export function captureCampaign(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  if (!params.has("utm_source")) return getCampaign();
  const source = params.get("utm_source") ?? "";
  const pick = (key: string, allowed: Set<string>) => {
    const value = params.get(key) ?? "";
    return allowed.has(value) ? value : "other";
  };
  const campaign: CampaignAttribution = {
    campaign_source: SOURCES.has(source) ? source : "other",
    campaign_medium: pick("utm_medium", MEDIA),
    campaign_name: pick("utm_campaign", CAMPAIGNS),
    campaign_content: pick("utm_content", CONTENT),
  };
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(campaign)); } catch { /* 계측 실패로 학습을 막지 않는다. */ }
  return campaign;
}

export function getCampaign(): CampaignAttribution {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    if (stored && (SOURCES.has(stored.campaign_source) || stored.campaign_source === "other")) {
      return {
        campaign_source: stored.campaign_source,
        campaign_medium: MEDIA.has(stored.campaign_medium) ? stored.campaign_medium : "other",
        campaign_name: CAMPAIGNS.has(stored.campaign_name) ? stored.campaign_name : "other",
        campaign_content: CONTENT.has(stored.campaign_content) ? stored.campaign_content : "other",
      };
    }
  } catch { /* 저장소를 사용할 수 없거나 손상되어도 학습은 계속한다. */ }
  return { ...DIRECT };
}

export function trackStartAttempt(entry_method: LearningEntryMethod): void {
  logEvent("sl_start_attempt", { ...getCampaign(), entry_method });
}

export function trackStartFailure(entry_method: LearningEntryMethod, reason: "auth" | "roadmap_load" | "roadmap_missing"): void {
  logEvent("sl_start_failed", { ...getCampaign(), entry_method, reason });
}

export function trackLearningCreated(learning_session_id: string, entry_method: LearningEntryMethod): void {
  logEvent("sl_learning_created", { ...getCampaign(), learning_session_id, entry_method });
}

export function trackFirstFeedbackView(learning_session_id: string, step_idx: number): void {
  if (!isInstrumentationEnabled()) return;
  // 같은 탭의 재렌더·답변 수정·뒤로 가기로 첫 체험 수를 부풀리지 않는다.
  // 별도 탭과 저장 불가 환경도 있으므로 보고서에서는 사용자와 학습 세션별로 중복 제거한다.
  const key = `socratic:growth:feedback:${learning_session_id}`;
  try { if (sessionStorage.getItem(key)) return; } catch { /* best effort */ }
  logEvent("sl_feedback_viewed", { ...getCampaign(), learning_session_id, step_idx });
  try { sessionStorage.setItem(key, "1"); } catch { /* best effort */ }
}
