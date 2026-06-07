/**
 * 낙관적 삭제 tombstone.
 *
 * 낙관적 삭제는 로컬을 즉시 지우고 원격 삭제를 뒤따라 시도한다. 원격 삭제가 실패하면
 * Firestore 에는 세션이 남아, 다음 접속 시 mergeSessionLists 가 그 세션을 목록에
 * 되살린다(원래 불편했던 재출현). 이를 막기 위해 삭제한 sessionId 를 localStorage 에
 * tombstone 으로 기록하고, 병합 시 tombstone 에 든 id 는 제외한다. 원격 삭제가 끝내
 * 성공하면 tombstone 을 제거한다(다음 접속의 재시도 포함).
 */

/** 삭제 표식(tombstone) sessionId 들을 모아두는 localStorage 단일 키. */
export const SESSIONS_TOMBSTONE_KEY = "socratic:sessions:tombstones";

/**
 * tombstone 에 든 sessionId 집합을 반환한다.
 *
 * 폴백 정책(누락/손상 → 빈 집합):
 * - 키 없음/JSON 파싱 실패/배열 아님: 빈 Set.
 * - 배열 내 문자열이 아닌 항목: 제외.
 */
export function listTombstones(storage: Storage = localStorage): Set<string> {
  const raw = storage.getItem(SESSIONS_TOMBSTONE_KEY);
  if (raw == null) return new Set();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) return new Set();
  return new Set(parsed.filter((v): v is string => typeof v === "string" && v.length > 0));
}

/** sessionId 를 tombstone 에 추가한다(이미 있으면 변화 없음). */
export function addTombstone(id: string, storage: Storage = localStorage): void {
  const ids = listTombstones(storage);
  if (ids.has(id)) return;
  ids.add(id);
  storage.setItem(SESSIONS_TOMBSTONE_KEY, JSON.stringify([...ids]));
}

/** sessionId 를 tombstone 에서 제거한다(원격 삭제가 끝내 성공했을 때). */
export function removeTombstone(id: string, storage: Storage = localStorage): void {
  const ids = listTombstones(storage);
  if (!ids.delete(id)) return;
  storage.setItem(SESSIONS_TOMBSTONE_KEY, JSON.stringify([...ids]));
}
