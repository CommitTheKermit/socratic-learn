import {
  deserializeSessionState,
  serializeSessionState,
  type SessionState,
} from "./sessionState";

/** localStorage 세션 값 키 접두사. sessionId 별로 분리 저장하여 단일 세션 손상이 전체로 번지지 않게 한다. */
export const SESSION_KEY_PREFIX = "socratic:session:";

/** 주어진 sessionId 에 대응하는 localStorage 키를 만든다. */
export function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/**
 * 학습 상태를 직렬화하여 localStorage 에 저장한다.
 * 키는 sessionId 기반으로 분리되며, 값은 serializeSessionState 결과(JSON 문자열)이다.
 * storage 는 테스트에서 mock 을 주입할 수 있도록 인자로 받는다(기본 localStorage).
 */
export function persistSession(state: SessionState, storage: Storage = localStorage): void {
  storage.setItem(sessionKey(state.sessionId), serializeSessionState(state));
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
