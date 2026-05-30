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

export interface ProbeRequest {
  concept: string;
  materials?: string;
}

export interface OutlineRequest {
  concept: string;
  level: number;
}

export interface StepDetailRequest {
  concept: string;
  level: number;
  outline: { title: string; desc: string }[];
  stepIdx: number;
}

export interface AnswerEvalRequest {
  concept: string;
  level: number;
  stepTitle: string;
  stepDesc: string;
  stepBody: string;
  questions: { id: string; q: string; answer: string }[];
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

import type { Step } from "../stages/data";

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

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8081";
