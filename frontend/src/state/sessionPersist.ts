import {
  deserializeSessionState,
  serializeSessionState,
  type SessionState,
} from "./sessionState";

/** localStorage 세션 값 키 접두사. sessionId 별로 분리 저장하여 단일 세션 손상이 전체로 번지지 않게 한다. */
export const SESSION_KEY_PREFIX = "socratic:session:";

/** 동시 보관 가능한 세션 본문 캐시 최대 개수. 초과 시 가장 오래된 비활성 세션부터 evict. */
export const MAX_SESSIONS = 20;

/** 주어진 sessionId 에 대응하는 localStorage 키를 만든다. */
export function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/** localStorage 의 용량 초과 에러를 판별한다(브라우저별 name/code 호환). */
export function isQuotaExceeded(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  const code = (e as { code?: number }).code;
  return code === 22 || code === 1014; // Safari 구버전 등
}

/**
 * localStorage 에 저장된 세션 본문 캐시 키들을 (sessionId, createdAt) 목록으로 모은다.
 * createdAt 오름차순(가장 오래된 것이 앞)으로 정렬해 반환한다.
 *
 * 세션 목록 인덱스를 제거한 뒤, evict 대상(가장 오래된 비활성 세션) 선정을 위해
 * 본문 키(SESSION_KEY_PREFIX)를 직접 스캔한다. 본문 파싱 실패(손상)는 createdAt=0 으로 보아
 * 우선 evict 후보가 되게 한다.
 */
function cachedSessions(storage: Storage): { id: string; createdAt: number }[] {
  const out: { id: string; createdAt: number }[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (k == null || !k.startsWith(SESSION_KEY_PREFIX)) continue;
    const id = k.slice(SESSION_KEY_PREFIX.length);
    let createdAt = 0;
    const raw = storage.getItem(k);
    if (raw != null) {
      try {
        createdAt = deserializeSessionState(raw).createdAt;
      } catch {
        createdAt = 0; // 손상 → 가장 오래된 것으로 취급(우선 evict)
      }
    }
    out.push({ id, createdAt });
  }
  out.sort((a, b) => a.createdAt - b.createdAt);
  return out;
}

/**
 * protectId 가 아닌 가장 오래된 본문 캐시 1건을 제거한다.
 * 제거할 후보가 없으면 false 를 반환한다(활성 1개만 남은 경우 등).
 */
function evictOldest(protectId: string, storage: Storage): boolean {
  for (const c of cachedSessions(storage)) {
    if (c.id === protectId) continue;
    try {
      storage.removeItem(sessionKey(c.id));
    } catch {
      // 본문 제거 실패는 무시.
    }
    return true;
  }
  return false;
}

/** MAX_SESSIONS 를 초과하는 동안 비활성 가장 오래된 본문 캐시를 반복 evict. */
function enforceCap(protectId: string, storage: Storage): void {
  while (cachedSessions(storage).length > MAX_SESSIONS) {
    if (!evictOldest(protectId, storage)) break;
  }
}

/**
 * Quota 발생 시 protectId 가 아닌 가장 오래된 1건을 evict 후 1회 재시도한다.
 * 재시도 후에도 실패하거나 Quota 외 에러면 그대로 throw.
 */
function trySetWithEviction(protectId: string, storage: Storage, write: () => void): void {
  try {
    write();
  } catch (e) {
    if (!isQuotaExceeded(e)) throw e;
    if (!evictOldest(protectId, storage)) throw e;
    write();
  }
}

/**
 * 학습 상태를 직렬화하여 localStorage 본문 캐시에 저장한다.
 * 키는 sessionId 기반으로 분리되며, 값은 serializeSessionState 결과(JSON 문자열)이다.
 *
 * 이 캐시는 단계별 세션 영속화(새로고침/단계 전환/세션 전환 시 즉시 복원)를 위한 것이다.
 * 사이드바 히스토리 목록의 진실 출처는 Firestore(원격)이며, 여기서 별도 인덱스는 만들지 않는다.
 *
 * Quota 처리: setItem 실패 시 활성(state.sessionId) 외 가장 오래된 세션을 1건 evict 후 1회 재시도.
 * 저장 성공 후 MAX_SESSIONS 초과 시 비활성 가장 오래된 세션을 반복 evict 하여 상한 유지.
 *
 * storage 는 테스트에서 mock 을 주입할 수 있도록 인자로 받는다(기본 localStorage).
 */
export function persistSession(state: SessionState, storage: Storage = localStorage): void {
  const key = sessionKey(state.sessionId);
  const value = serializeSessionState(state);
  trySetWithEviction(state.sessionId, storage, () => {
    storage.setItem(key, value);
  });
  enforceCap(state.sessionId, storage);
}

/**
 * localStorage 본문 캐시에서 sessionId 에 대응하는 학습 상태를 읽어 복원한다.
 *
 * 기본값 폴백 정책:
 * - 정상 값: deserializeSessionState 로 복원하되, 누락/타입 불일치 필드는 안전한 기본값으로 보정한다.
 * - 누락(키 없음): null 을 반환한다(저장된 세션이 없음).
 * - 손상(JSON 파싱 실패/객체 아님): 예외를 삼키고 null 을 반환하여 단일 세션 손상이
 *   호출 측 크래시로 번지지 않게 한다(손상 세션 격리/제거는 호출 측 책임).
 *
 * storage 는 테스트에서 mock 을 주입할 수 있도록 인자로 받는다(기본 localStorage).
 */
export function loadSession(
  sessionId: string,
  storage: Storage = localStorage,
): SessionState | null {
  const raw = storage.getItem(sessionKey(sessionId));
  if (raw == null) return null;
  try {
    return deserializeSessionState(raw);
  } catch {
    return null;
  }
}
