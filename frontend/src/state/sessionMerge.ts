import type { FieldUpdatedAt, SessionState } from "./sessionState";

/**
 * Firestore 동기화를 위한 순수 함수 코어.
 * 네트워크/Firestore/React 의존 없이 SessionState 도메인 모델만 다룬다.
 */

/**
 * 병합/스탬핑 대상이 되는 SessionState 최상위 필드 목록.
 *
 * sessionId/createdAt 은 세션 식별자(불변)라 제외한다. answers/skips/stepEvaluations 같은
 * 맵은 각각 통째로 1개 필드로 취급한다(맵 내부 키 단위 병합은 범위 밖).
 */
export const MERGEABLE_FIELDS = [
  "conceptSummary",
  "stage",
  "mode",
  "concept",
  "materials",
  "probes",
  "estimatedLevel",
  "stepIdx",
  "answers",
  "skips",
  "probeQuestions",
  "probeReady",
  "steps",
  "stepEvaluations",
  "stepBranches",
  "branchedStepIds",
] as const satisfies readonly (keyof SessionState)[];

export type MergeableField = (typeof MERGEABLE_FIELDS)[number];

/**
 * JSON 호환 값에 대한 깊은 동등성 비교.
 * 키 순서에 무관하게 객체/배열/원시값을 구조적으로 비교한다.
 * (SessionState 필드는 JSON 직렬화 가능 값만 담는다는 불변식에 기댄다.)
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== "object" || typeof b !== "object") return false;

  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;

  if (aArr && bArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

/**
 * prev 대비 값이 변경된 최상위 필드에 대해서만 fieldUpdatedAt 항목을 nowIso 로 스탬핑한다.
 *
 * - 변경된 필드: nowIso 로 갱신
 * - 변경되지 않은 필드: prev.fieldUpdatedAt 의 기존 타임스탬프를 그대로 보존
 * - prev.fieldUpdatedAt 누락 시 빈 객체로 안전 보정한다
 *
 * 부수효과 없는 순수 함수다(입력을 변형하지 않고 새 맵을 반환).
 *
 * @returns 갱신된 fieldUpdatedAt 맵(prev 기존 스탬프 + 변경 필드의 nowIso)
 */
export function stampFieldUpdatedAt(
  prev: SessionState,
  next: SessionState,
  nowIso: string,
): FieldUpdatedAt {
  const result: FieldUpdatedAt = { ...(prev.fieldUpdatedAt ?? {}) };
  for (const field of MERGEABLE_FIELDS) {
    if (!deepEqual(prev[field], next[field])) {
      result[field] = nowIso;
    }
  }
  return result;
}

/**
 * 동률 시 승자를 결정하는 인자. 'a' 또는 'b' 중 하나로 결정적으로 고른다.
 */
export type ServerWins = "a" | "b";

/**
 * 한 최상위 필드에 대한 승자를 결정한다.
 *
 * - 양측 모두 타임스탬프 보유: 더 최신(ISO8601 사전식 = 시간순)인 쪽이 승자.
 *   동률이면 serverWins 인자로 결정적으로 고른다.
 * - 한쪽만 타임스탬프 보유: 그쪽이 승자(단측 스탬프 보존).
 * - 양측 모두 타임스탬프 없음: 값이 정의된 쪽을 우선하며, 둘 다 정의되면 serverWins 를 채택한다.
 */
function pickFieldWinner(
  tsA: string | undefined,
  tsB: string | undefined,
  serverWins: ServerWins,
): "a" | "b" {
  if (tsA != null && tsB != null) {
    if (tsB > tsA) return "b";
    if (tsA > tsB) return "a";
    return serverWins; // 동률 → 결정적 tiebreaker
  }
  if (tsA != null) return "a";
  if (tsB != null) return "b";
  return serverWins;
}

/**
 * 두 SessionState 를 필드별 최신 updatedAt 승자 병합으로 합친다.
 *
 * 각 최상위 mergeable 필드에 대해 fieldUpdatedAt 타임스탬프가 더 최신인 쪽의 값을 채택한다.
 * - 동률: serverWins 인자로 결정적으로 채택(기본 'a')
 * - 한쪽만 스탬프 보유: 그쪽 값 채택(단측 보존)
 * - 양측 스탬프 없음: 값이 정의된 쪽 우선, 둘 다면 serverWins
 *
 * 식별자 필드(sessionId/createdAt)는 동일 세션 전제로 a 를 채택하되 누락 시 b 로 보정한다.
 * 결과 fieldUpdatedAt 는 양측 맵의 필드별 최신 타임스탬프를 합쳐서 만든다.
 *
 * 부수효과 없는 순수 함수다(입력을 변형하지 않고 새 객체를 반환).
 *
 * @param serverWins 동률(타임스탬프 동일/양측 무스탬프) 시 승자를 결정하는 인자. 기본 'a'.
 */
export function mergeSessions(
  a: SessionState,
  b: SessionState,
  serverWins: ServerWins = "a",
): SessionState {
  const merged: SessionState = {
    sessionId: a.sessionId || b.sessionId,
    createdAt: a.createdAt || b.createdAt,
    // 부모 링크는 생성 시점 불변 식별 필드라 mergeable 이 아니다(어느 쪽이든 값이 있으면 보존).
    parentSessionId: a.parentSessionId ?? b.parentSessionId,
    // 아래 mergeable 필드들은 루프에서 덮어쓴다. 타입 충족을 위한 초기값.
    conceptSummary: a.conceptSummary,
    stage: a.stage,
    mode: a.mode,
    concept: a.concept,
    materials: a.materials,
    probes: a.probes,
    estimatedLevel: a.estimatedLevel,
    stepIdx: a.stepIdx,
    answers: a.answers,
    skips: a.skips,
  };

  const stampA = a.fieldUpdatedAt ?? {};
  const stampB = b.fieldUpdatedAt ?? {};

  for (const field of MERGEABLE_FIELDS) {
    const tsA = stampA[field];
    const tsB = stampB[field];
    let winner = pickFieldWinner(tsA, tsB, serverWins);
    // 타임스탬프가 양측 모두 없을 때만 값 정의 여부로 단측 보존을 적용한다.
    if (tsA == null && tsB == null) {
      const aDefined = a[field] !== undefined;
      const bDefined = b[field] !== undefined;
      if (aDefined && !bDefined) winner = "a";
      else if (!aDefined && bDefined) winner = "b";
    }
    const src = winner === "a" ? a : b;
    // 선택된 소스의 값을 그대로 채택한다(undefined 면 해당 키는 결과에서 생략됨).
    (merged as unknown as Record<string, unknown>)[field] = src[field];
  }

  // 결과 fieldUpdatedAt: 양측 맵 키 합집합에 대해 더 최신 타임스탬프를 채택한다.
  const mergedStamp: FieldUpdatedAt = {};
  for (const key of new Set([...Object.keys(stampA), ...Object.keys(stampB)])) {
    const tsA = stampA[key];
    const tsB = stampB[key];
    if (tsA != null && tsB != null) mergedStamp[key] = tsB > tsA ? tsB : tsA;
    else mergedStamp[key] = (tsA ?? tsB) as string;
  }
  if (Object.keys(mergedStamp).length) merged.fieldUpdatedAt = mergedStamp;

  return merged;
}
