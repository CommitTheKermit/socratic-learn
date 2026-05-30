import type { ProbeAnswers, Stage } from "../stages/data";

/**
 * localStorage 에 영속화되는 단일 학습 세션의 전체 상태.
 * JSON 호환 필드만 포함한다(함수/undefined/순환참조 금지).
 */
export interface SessionState {
  sessionId: string;
  createdAt: number;
  conceptSummary: string;
  stage: Stage;
  depth: string;
  concept: string;
  materials: string;
  probes: ProbeAnswers;
  estimatedLevel: number | null;
  stepIdx: number;
  answers: Record<string, string>;
  skips: Record<string, boolean>;
}

const STAGES: readonly Stage[] = ["input", "probe", "learn", "done"];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asStage(v: unknown): Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v)
    ? (v as Stage)
    : "input";
}

function asProbes(v: unknown): ProbeAnswers {
  if (v == null || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const out: ProbeAnswers = {};
  if (typeof o.p1 === "number") out.p1 = o.p1;
  if (Array.isArray(o.p2)) out.p2 = o.p2.filter((x): x is string => typeof x === "string");
  if (typeof o.p3 === "string") out.p3 = o.p3;
  return out;
}

function asStringRecord(v: unknown): Record<string, string> {
  if (v == null || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") out[k] = val;
  }
  return out;
}

function asBoolRecord(v: unknown): Record<string, boolean> {
  if (v == null || typeof v !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "boolean") out[k] = val;
  }
  return out;
}

/**
 * 학습 상태를 JSON 문자열로 직렬화한다.
 * 알려진 필드만 명시적으로 직렬화하여 타입 안전성을 유지한다.
 */
export function serializeSessionState(state: SessionState): string {
  const payload: SessionState = {
    sessionId: state.sessionId,
    createdAt: state.createdAt,
    conceptSummary: state.conceptSummary,
    stage: state.stage,
    depth: state.depth,
    concept: state.concept,
    materials: state.materials,
    probes: state.probes,
    estimatedLevel: state.estimatedLevel,
    stepIdx: state.stepIdx,
    answers: state.answers,
    skips: state.skips,
  };
  return JSON.stringify(payload);
}

/**
 * JSON 문자열을 학습 상태로 역직렬화한다.
 * 파싱 실패 또는 객체가 아닌 경우 throw 한다(손상 세션 격리는 호출 측 책임).
 * 각 필드는 타입 검증 후 누락/불일치 시 안전한 기본값으로 보정한다.
 */
export function deserializeSessionState(json: string): SessionState {
  const raw: unknown = JSON.parse(json);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("SessionState 역직렬화 실패: 객체가 아님");
  }
  const o = raw as Record<string, unknown>;
  const estimated = o.estimatedLevel;
  return {
    sessionId: asString(o.sessionId),
    createdAt: asNumber(o.createdAt),
    conceptSummary: asString(o.conceptSummary),
    stage: asStage(o.stage),
    depth: asString(o.depth, "0depth"),
    concept: asString(o.concept),
    materials: asString(o.materials),
    probes: asProbes(o.probes),
    estimatedLevel:
      typeof estimated === "number" && Number.isFinite(estimated) ? estimated : null,
    stepIdx: asNumber(o.stepIdx),
    answers: asStringRecord(o.answers),
    skips: asBoolRecord(o.skips),
  };
}
