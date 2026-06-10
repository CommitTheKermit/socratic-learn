// SOURCE OF TRUTH: 이 파일이 API 경로/DTO 의 단일 진실 출처다.
// (구 shared/ Kotlin 미러는 Firebase Functions 이전 후 제거됨.)
// ApiPaths 의 키 = Function 이름 = 경로. functions/src/<fn>.ts 와 같은 PR 에서 함께 수정한다.

export const ApiPaths = {
  // Firebase Functions 로 이전된 엔드포인트 (함수명 = 경로)
  OVERWHELM: "/overwhelm",
  PROBE: "/probe",
  OUTLINE: "/outline",
  STEP_DETAIL: "/stepDetail",
  ANSWER_EVAL: "/answerEval",
  BRANCH_EVAL: "/branchEval",
  STEP_DETAIL_STREAM: "/stepDetailStream",
  // 학습 세션 Firestore 영속화 (Anthropic 미사용. 함수명=경로, :id 대신 query param).
  SESSION_SAVE: "/sessionSave",
  SESSION_LIST: "/sessionList",
  SESSION_GET: "/sessionGet",
  SESSION_DELETE: "/sessionDelete",
} as const;

// stepDetailStream SSE 이벤트. body 는 delta 로 흘리고 questions 는 complete 에 담긴다.
export const StreamEvents = {
  STATUS: "status",
  DELTA: "delta",
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export interface StreamStatusPayload {
  status: string;
  message: string;
}
export interface StreamDeltaPayload {
  text: string;
}
export interface StepDetailStreamComplete {
  body: string;
  questions: { id: string; q: string }[];
}
export interface StreamErrorPayload {
  code: string;
  message: string;
}

export interface OverwhelmRequest {
  concept: string;
  materials?: string;
  probeSummary: string;
}

export interface OverwhelmDecision {
  shouldRetreat: boolean;
  reason: string;
  suggestedConcept: string;
}

/** 답변 모드. 학습 강도(질문 난이도·분기·채점·설명 깊이)를 정한다. frontend ANSWER_MODES id 와 동일. */
export type LearnMode = "light" | "socratic" | "deep";

export interface ProbeRequest {
  concept: string;
  materials?: string;
  mode?: LearnMode;
}

export interface OutlineRequest {
  concept: string;
  level: number;
  mode?: LearnMode;
}

export interface StepDetailRequest {
  concept: string;
  level: number;
  outline: { title: string; desc: string }[];
  stepIdx: number;
  mode?: LearnMode;
}

export interface AnswerEvalRequest {
  concept: string;
  level: number;
  stepTitle: string;
  stepDesc: string;
  stepBody: string;
  questions: { id: string; q: string; answer: string }[];
  mode?: LearnMode;
}

export interface BranchEvalRequest {
  concept: string;
  level: number;
  stepTitle: string;
  stepDesc: string;
  stepBody: string;
  questions: { id: string; q: string; answer: string }[];
  roadmapOutlineText: string;
}

import type { Stage, Step } from "../stages/data";
import type { SessionState } from "../state/sessionState";

export type BranchOptionType =
  | "roadmap_next"
  | "ai_recommended"
  | "additional"
  | "exit";

export interface BranchOption {
  label: string;
  type: BranchOptionType;
  isRecommended: boolean;
  stageContent: Step | null;
}

export type BranchPhaseStage =
  | "idle"
  | "evaluating"
  | "awaiting_choice"
  | "merged"
  | "error";

export interface EvaluationResponse {
  evaluationText: string;
  isMerged: boolean;
  branchOptions: BranchOption[];
}

export interface ParseFailure {
  parseError: string;
}

export interface BranchPhaseState {
  stage: BranchPhaseStage;
  parseError: boolean;
  retryCount: number;
  lastErrorMessage: string | null;
}

// ── 학습 세션 Firestore 영속화 DTO ──
// 서버는 state 본문을 불투명 JSON 으로 저장하고 serverUpdatedAt 만 덧붙인다(병합은 클라이언트 코어가 수행).

/** POST /sessionSave 요청. state.sessionId 로 uid 격리 컬렉션에 upsert 한다. */
export interface SessionSaveRequest {
  state: SessionState;
}

/** 세션 목록 1건. 사이드바 렌더링용 경량 메타(본문 미포함). updatedAt 은 서버 수신 millis. */
export interface SessionIndexEntry {
  sessionId: string;
  conceptSummary: string;
  stage: Stage;
  updatedAt: number;
}

/** GET /sessionList 응답. updatedAt 내림차순 정렬된 메타 목록. */
export interface SessionListResponse {
  sessions: SessionIndexEntry[];
}

/** GET /sessionGet?id= 응답. 없으면 state=null. */
export interface SessionGetResponse {
  state: SessionState | null;
}

/** POST /sessionDelete 요청. uid 격리 컬렉션에서 해당 세션을 영구 삭제한다. */
export interface SessionDeleteRequest {
  sessionId: string;
}

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8081";
