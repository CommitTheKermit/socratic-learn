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
  "depth",
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
