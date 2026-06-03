import type { ProbeAnswers, ProbeQuestion, Stage, Step } from "../stages/data";
import type { StepEvaluation } from "../api/claudeContent";

/**
 * SessionState 최상위 필드명을 키로, 마지막으로 변경된 시각(ISO8601)을 값으로 갖는 맵.
 * Firestore 동기화 시 필드별 최신 updatedAt 승자 병합의 기준이 된다.
 */
export type FieldUpdatedAt = Record<string, string>;

/**
 * localStorage 에 영속화되는 단일 학습 세션의 전체 상태.
 * JSON 호환 필드만 포함한다(함수/undefined/순환참조 금지).
 *
 * 사용자 입력값(concept/probes/answers...) 외에, 재접속/세션 전환 시 재로딩을 막기 위해
 * AI 가 이미 생성한 산출물(probeQuestions/steps/stepEvaluations)도 함께 보관한다.
 * 산출물 필드는 아직 생성 전이면 누락(undefined)되며, 복원 측은 누락 시 새로 로드한다.
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
  // ── AI 산출물(재로딩 방지용) ──
  /** 진단 문항. probeReady 가 true 일 때만 실제 생성된 값으로 신뢰한다. */
  probeQuestions?: ProbeQuestion[];
  /** 진단 문항이 실제로 생성 완료되었는지(fallback 이 아닌지). */
  probeReady?: boolean;
  /** 로드맵 단계들. 각 step 의 body/questions 가 채워져 있으면 해당 단계는 이미 로딩 완료. */
  steps?: Step[];
  /** stepIdx 별 답변 평가 결과. */
  stepEvaluations?: Record<number, StepEvaluation>;
  /** 최상위 필드별 마지막 변경 시각(ISO8601). 누락 시 빈 객체로 취급한다. */
  fieldUpdatedAt?: FieldUpdatedAt;
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
 * 진단 문항 배열을 보정한다. 최소 형태(id/kind 문자열)만 검증하고 나머지는 신뢰한다.
 * 배열이 아니거나 항목이 0개면 undefined 를 반환해 "산출물 없음"으로 취급한다.
 */
function asProbeQuestions(v: unknown): ProbeQuestion[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter(
    (x): x is ProbeQuestion =>
      x != null &&
      typeof x === "object" &&
      typeof (x as { id?: unknown }).id === "string" &&
      typeof (x as { kind?: unknown }).kind === "string",
  );
  return out.length ? out : undefined;
}

/**
 * 로드맵 단계 배열을 보정한다. id(number)/title(string) 이 있어야 유효하며,
 * body/desc/questions 는 누락 시 안전 기본값으로 채운다(body 가 비면 복원 측이 재로딩).
 */
function asSteps(v: unknown): Step[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Step[] = [];
  for (const x of v) {
    if (x == null || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "number" || typeof o.title !== "string") continue;
    const questions = Array.isArray(o.questions)
      ? o.questions.filter(
          (q): q is { id: string; q: string } =>
            q != null &&
            typeof q === "object" &&
            typeof (q as { id?: unknown }).id === "string" &&
            typeof (q as { q?: unknown }).q === "string",
        )
      : [];
    out.push({
      id: o.id,
      title: o.title,
      desc: typeof o.desc === "string" ? o.desc : "",
      body: typeof o.body === "string" ? o.body : "",
      questions,
    });
  }
  return out.length ? out : undefined;
}

/**
 * stepIdx 별 평가 결과 맵을 보정한다. 각 항목은 evaluations 배열을 가져야 한다.
 */
function asStepEvaluations(v: unknown): Record<number, StepEvaluation> | undefined {
  if (v == null || typeof v !== "object") return undefined;
  const out: Record<number, StepEvaluation> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const idx = Number(k);
    if (!Number.isInteger(idx)) continue;
    if (val == null || typeof val !== "object") continue;
    const evals = (val as { evaluations?: unknown }).evaluations;
    if (!Array.isArray(evals)) continue;
    out[idx] = {
      evaluations: evals.filter(
        (e): e is StepEvaluation["evaluations"][number] =>
          e != null &&
          typeof e === "object" &&
          typeof (e as { id?: unknown }).id === "string" &&
          typeof (e as { grade?: unknown }).grade === "string" &&
          typeof (e as { feedback?: unknown }).feedback === "string",
      ),
    };
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * 필드별 변경 시각 맵을 보정한다. 값이 문자열인 항목만 신뢰한다.
 *
 * 누락(undefined/null)되었거나 손상된(비객체/배열 등 잘못된 타입) 입력은
 * 빈 객체({})로 안전 보정한다. 이로써 deserialize 결과의 fieldUpdatedAt 는
 * 항상 존재하는 Record<string,string> 맵이 되어 병합/스탬핑 코어가 안전하게 읽는다.
 * (빈 맵은 직렬화에서 생략되므로 기존 직렬화 포맷 호환은 유지된다.)
 */
function asFieldUpdatedAt(v: unknown): FieldUpdatedAt {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return {};
  const out: FieldUpdatedAt = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === "string") out[k] = val;
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
  // 산출물은 존재할 때만 직렬화에 포함한다(undefined 는 JSON 에서 자동 생략되지만 명시적으로 둔다).
  if (state.probeReady && state.probeQuestions?.length) {
    payload.probeQuestions = state.probeQuestions;
    payload.probeReady = true;
  }
  if (state.steps?.length) payload.steps = state.steps;
  if (state.stepEvaluations && Object.keys(state.stepEvaluations).length) {
    payload.stepEvaluations = state.stepEvaluations;
  }
  if (state.fieldUpdatedAt && Object.keys(state.fieldUpdatedAt).length) {
    payload.fieldUpdatedAt = state.fieldUpdatedAt;
  }
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
  const probeQuestions = asProbeQuestions(o.probeQuestions);
  const steps = asSteps(o.steps);
  const stepEvaluations = asStepEvaluations(o.stepEvaluations);
  const fieldUpdatedAt = asFieldUpdatedAt(o.fieldUpdatedAt);
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
    probeQuestions,
    probeReady: probeQuestions ? o.probeReady === true : undefined,
    steps,
    stepEvaluations,
    fieldUpdatedAt,
  };
}
