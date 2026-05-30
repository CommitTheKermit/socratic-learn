import {
  deserializeSessionState,
  serializeSessionState,
  type SessionState,
} from "./sessionState";
import { listSessions, removeSessionMeta, upsertSessionMeta } from "./sessionIndex";

/** localStorage 세션 값 키 접두사. sessionId 별로 분리 저장하여 단일 세션 손상이 전체로 번지지 않게 한다. */
export const SESSION_KEY_PREFIX = "socratic:session:";

/** 동시 보관 가능한 세션 메타 최대 개수. 초과 시 가장 오래된 비활성 세션부터 evict. */
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
 * 인덱스에서 protectId 가 아닌 가장 오래된 세션 1건과 그 본문 키를 제거한다.
 * 제거할 후보가 없으면 false 를 반환한다(활성 1개만 남은 경우 등).
 */
function evictOldest(protectId: string, storage: Storage): boolean {
  const metas = listSessions(storage); // 내림차순(최신 위) → 마지막이 가장 오래된
  for (let i = metas.length - 1; i >= 0; i -= 1) {
    const candidate = metas[i];
    if (candidate.sessionId === protectId) continue;
    removeSessionMeta(candidate.sessionId, storage);
    try {
      storage.removeItem(sessionKey(candidate.sessionId));
    } catch {
      // 본문 제거 실패는 인덱스 정리 효과를 살리고 무시.
    }
    return true;
  }
  return false;
}

/** MAX_SESSIONS 를 초과하는 동안 비활성 가장 오래된 세션을 반복 evict. */
function enforceCap(protectId: string, storage: Storage): void {
  while (listSessions(storage).length > MAX_SESSIONS) {
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
 * 학습 상태를 직렬화하여 localStorage 에 저장한다.
 * 키는 sessionId 기반으로 분리되며, 값은 serializeSessionState 결과(JSON 문자열)이다.
 *
 * 동시에 세션 인덱스(SESSIONS_INDEX_KEY)도 upsertSessionMeta 로 갱신하여
 * 사이드바 히스토리가 항상 최신 메타를 반영하게 한다. 같은 sessionId 가
 * 이미 인덱스에 있으면 createdAt 은 보존하고(최초 생성 시각 유지) conceptSummary/stage 만 갱신한다.
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
  const existing = listSessions(storage).find((m) => m.sessionId === state.sessionId);
  const meta = {
    sessionId: state.sessionId,
    createdAt: existing ? existing.createdAt : state.createdAt,
    conceptSummary: state.conceptSummary,
    stage: state.stage,
  };
  trySetWithEviction(state.sessionId, storage, () => {
    upsertSessionMeta(meta, storage);
  });
  enforceCap(state.sessionId, storage);
}

/**
 * localStorage 에서 sessionId 에 대응하는 학습 상태를 읽어 복원한다.
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
