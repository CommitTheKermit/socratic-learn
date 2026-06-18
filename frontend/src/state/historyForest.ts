import type { SessionMeta } from "./sessionIndex";
import type { Stage } from "../stages/data";

/**
 * 사이드바 학습 히스토리를 부모-하위 세션 트리(방향 A)로 그리기 위한 표시 모델.
 * 실제로 시작된(존재하는) 학습 세션만 노드가 된다. "선행 개념 보기"로 트리를 만들었어도
 * "이 개념부터 학습" 으로 실제 시작하지 않은 선행은 히스토리에 넣지 않는다(미시작 placeholder 폐지).
 */
export interface HistoryNode {
  /** 표시 개념명(세션의 conceptSummary). */
  concept: string;
  /** 부모 체인 깊이(원개념=0, 하위=1, 하위의 하위=2). */
  depth: number;
  sessionId: string;
  stage: Stage;
  createdAt: number;
  children: HistoryNode[];
}

/**
 * 평면 세션 메타 목록을 받아, 부모-하위 트리 forest 를 만든다.
 * - 루트(부모 없는 세션)들을 입력 순서대로 최상위에 둔다.
 * - 각 세션 아래에 parentSessionId 로 연결된 실제 하위 세션만 중첩한다.
 * - maxDepth 까지만 중첩한다(원개념→하위→하위 = 깊이 2).
 *
 * 순수 함수.
 */
export function buildHistoryForest(sessions: SessionMeta[], maxDepth = 2): HistoryNode[] {
  const childrenByParent = new Map<string, SessionMeta[]>();
  for (const s of sessions) {
    if (s.parentSessionId) {
      const arr = childrenByParent.get(s.parentSessionId) ?? [];
      arr.push(s);
      childrenByParent.set(s.parentSessionId, arr);
    }
  }

  const buildSessionNode = (s: SessionMeta, depth: number): HistoryNode => ({
    concept: s.conceptSummary,
    depth,
    sessionId: s.sessionId,
    stage: s.stage,
    createdAt: s.createdAt,
    children:
      depth >= maxDepth
        ? []
        : (childrenByParent.get(s.sessionId) ?? []).map((k) => buildSessionNode(k, depth + 1)),
  });

  return sessions.filter((s) => !s.parentSessionId).map((s) => buildSessionNode(s, 0));
}
