// 1:1 mirror of shared/src/commonMain/kotlin/socratic/learn/shared
// SOURCE OF TRUTH: shared/ Kotlin module. Sync manually on any shared change (PR checklist).

export const ApiPaths = {
  HEALTH: "/health",
  LEARN_STREAM: "/learn/stream",
  ANSWERS: "/answers",
} as const;

export const SseEvents = {
  STATUS: "status",
  DELTA: "delta",
  COMPLETE: "complete",
  ERROR: "error",
} as const;

export type SseEventName = (typeof SseEvents)[keyof typeof SseEvents];

export interface LearnStreamRequest {
  concept: string;
  language?: string;
}

export interface StreamStatusEvent {
  status: string;
  message: string;
}

export interface StreamDeltaEvent {
  text: string;
}

export interface StreamCompleteEvent {
  content: string;
}

export interface StreamErrorEvent {
  code: string;
  message: string;
}

export interface AnswerItem {
  questionId?: string;
  question?: string;
  answer?: string;
  unknown?: boolean;
}

export interface AnswerSubmissionRequest {
  sessionId?: string;
  concept?: string;
  answers: AnswerItem[];
}

export interface AnswerSubmissionResponse {
  status: string;
  receivedCount: number;
  message: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
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

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8081";
