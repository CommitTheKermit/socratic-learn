import type { SessionMeta } from "./sessionIndex";
import type { PrereqNode } from "../api/contract";
import type { Stage } from "../stages/data";

/**
 * 사이드바 학습 히스토리를 부모-하위 세션 트리(방향 A)로 그리기 위한 표시 모델.
 * - kind="session": 실제 학습 세션(시작됨).
 * - kind="placeholder": 부모의 선행 트리에 있으나 아직 시작 안 한 개념(추천 노드).
 */
export interface HistoryNode {
  kind: "session" | "placeholder";
  /** 표시 개념명(세션의 conceptSummary 또는 placeholder 개념). */
  concept: string;
  /** 부모 체인 깊이(원개념=0, 하위=1, 하위의 하위=2). */
  depth: number;
  /** session 일 때만: 세션 id/단계/생성시각. */
  sessionId?: string;
  stage?: Stage;
  createdAt?: number;
  /** placeholder 일 때만: "이 개념부터 학습" 시 부모로 붙일 세션 id. */
  parentSessionId?: string;
  children: HistoryNode[];
}

/**
 * 평면 세션 메타 목록 + 각 세션의 선행 트리를 받아, 부모-하위 트리 forest 를 만든다.
 * - 루트(부모 없는 세션)들을 입력 순서대로 최상위에 둔다.
 * - 각 세션 아래에 그 세션의 선행 트리 노드를 깐다(시작된 개념=하위 세션, 미시작=placeholder).
 * - 선행 트리에 없지만 실제로 시작된 하위 세션도 보존한다(트리 변경/직접 생성 대비).
 * - maxDepth 까지만 중첩한다(원개념→하위→하위 = 깊이 2).
 *
 * 순수 함수. getPrereqTree 는 sessionId → 그 세션이 생성한 선행 트리(없으면 빈 배열).
 */
export function buildHistoryForest(
  sessions: SessionMeta[],
  getPrereqTree: (sessionId: string) => PrereqNode[],
  maxDepth = 2,
): HistoryNode[] {
  const childrenByParent = new Map<string, SessionMeta[]>();
  for (const s of sessions) {
    if (s.parentSessionId) {
      const arr = childrenByParent.get(s.parentSessionId) ?? [];
      arr.push(s);
      childrenByParent.set(s.parentSessionId, arr);
    }
  }

  const buildSessionNode = (s: SessionMeta, depth: number): HistoryNode => ({
    kind: "session",
    concept: s.conceptSummary,
    depth,
    sessionId: s.sessionId,
    stage: s.stage,
    createdAt: s.createdAt,
    children: buildChildren(s, depth),
  });

  const buildChildren = (s: SessionMeta, depth: number): HistoryNode[] => {
    if (depth >= maxDepth) return [];
    const kids = childrenByParent.get(s.sessionId) ?? [];
    const startedByConcept = new Map(kids.map((k) => [k.conceptSummary, k]));
    const usedIds = new Set<string>();
    const nodes: HistoryNode[] = [];
    for (const t of getPrereqTree(s.sessionId)) {
      const started = startedByConcept.get(t.concept);
      if (started) {
        usedIds.add(started.sessionId);
        nodes.push(buildSessionNode(started, depth + 1));
      } else {
        nodes.push({
          kind: "placeholder",
          concept: t.concept,
          depth: depth + 1,
          parentSessionId: s.sessionId,
          children: [],
        });
      }
    }
    // 선행 트리에 매칭되지 않은 시작된 하위 세션도 끝에 보존한다.
    for (const k of kids) {
      if (!usedIds.has(k.sessionId)) nodes.push(buildSessionNode(k, depth + 1));
    }
    return nodes;
  };

  return sessions.filter((s) => !s.parentSessionId).map((s) => buildSessionNode(s, 0));
}
