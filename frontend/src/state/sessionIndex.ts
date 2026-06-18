import type { Stage } from "../stages/data";

/**
 * 사이드바 히스토리 목록의 단일 항목 메타데이터.
 * 세션 본문(SessionState)과 분리되어, 목록 렌더링에 필요한 최소 정보만 담는다.
 *
 * 목록의 진실 출처는 Firestore(원격)이며, localStorage 에는 더 이상 인덱스를 두지 않는다.
 * (구 socratic:sessions:index 는 제거됨. 사이드바 목록은 App 의 메모리 상태가 원격 + 현재
 * 세션을 머지해 보유한다.)
 */
export interface SessionMeta {
  sessionId: string;
  createdAt: number;
  conceptSummary: string;
  stage: Stage;
  /** 선행 개념 하위 세션이면 부모 세션 id. 사이드바 트리(부모 아래 들여쓰기)를 그리는 데 쓴다. */
  parentSessionId?: string;
}

/**
 * 세션 목록 항목의 React key 를 도출한다.
 *
 * key 는 sessionId 만으로 결정한다. stage/conceptSummary/createdAt 등이 바뀌어도
 * 동일 세션은 항상 동일 key 를 반환하므로 단계 전환 시 비활성 항목의 리마운트를 억제한다.
 *
 * 순수 함수(부수효과 없음). 동일 입력 → 동일 출력.
 */
export function getSessionItemKey(session: SessionMeta): string {
  return session.sessionId;
}

/**
 * 두 SessionMeta 배열이 항목 단위로 동일한지 비교한다(참조 안정성 판별용).
 *
 * 비교 전략:
 * 1) 길이가 다르면 즉시 false
 * 2) 같은 인덱스 원소의 sessionId/stage/conceptSummary/createdAt 4필드를 === 비교
 * 3) 모두 같으면 true (호출 측은 이전 배열 참조를 그대로 반환해야 한다)
 *
 * React setSessions 의 함수형 업데이트에서 이전 참조를 재사용할지 판단하는 데 쓴다.
 * Object.is(prev, next) === true 를 보장하려면 true 일 때 prev 를 반환해야 한다.
 */
export function sessionListsEqual(a: SessionMeta[], b: SessionMeta[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (
      ai.sessionId !== bi.sessionId ||
      ai.stage !== bi.stage ||
      ai.conceptSummary !== bi.conceptSummary ||
      ai.createdAt !== bi.createdAt
    ) {
      return false;
    }
  }
  return true;
}
