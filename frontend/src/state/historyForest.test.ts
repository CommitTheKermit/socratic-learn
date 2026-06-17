import { describe, test, expect } from "vitest";
import { buildHistoryForest } from "./historyForest";
import type { SessionMeta } from "./sessionIndex";
import type { PrereqNode } from "../api/contract";

function meta(sessionId: string, conceptSummary: string, parentSessionId?: string): SessionMeta {
  return { sessionId, conceptSummary, stage: "learn", createdAt: 1, parentSessionId };
}
const leaf = (concept: string): PrereqNode => ({ concept, reason: "", children: [] });

describe("buildHistoryForest", () => {
  test("부모 없는 세션은 모두 루트(depth 0)", () => {
    const forest = buildHistoryForest([meta("a", "A"), meta("b", "B")], () => []);
    expect(forest).toHaveLength(2);
    expect(forest.every((n) => n.kind === "session" && n.depth === 0 && n.children.length === 0)).toBe(true);
  });

  test("선행 트리 노드가 미시작이면 placeholder 로 나온다", () => {
    const forest = buildHistoryForest([meta("a", "코루틴")], (id) =>
      id === "a" ? [leaf("동시성"), leaf("스레드")] : [],
    );
    expect(forest[0].children).toHaveLength(2);
    expect(forest[0].children[0]).toMatchObject({
      kind: "placeholder",
      concept: "동시성",
      depth: 1,
      parentSessionId: "a",
    });
  });

  test("선행 개념으로 시작된 하위 세션은 placeholder 대신 session 노드로 매칭된다", () => {
    const sessions = [meta("a", "코루틴"), meta("b", "동시성", "a")];
    const forest = buildHistoryForest(sessions, (id) => (id === "a" ? [leaf("동시성"), leaf("스레드")] : []));
    const kids = forest[0].children;
    expect(kids).toHaveLength(2);
    expect(kids[0]).toMatchObject({ kind: "session", sessionId: "b", concept: "동시성", depth: 1 });
    expect(kids[1]).toMatchObject({ kind: "placeholder", concept: "스레드" });
    // 하위 세션은 최상위 루트로 중복 노출되지 않는다.
    expect(forest).toHaveLength(1);
  });

  test("깊이 2 까지만 중첩한다(그 아래는 children 비움)", () => {
    const sessions = [meta("a", "A"), meta("b", "B", "a"), meta("c", "C", "b")];
    const tree = (id: string): PrereqNode[] =>
      id === "a" ? [leaf("B")] : id === "b" ? [leaf("C")] : id === "c" ? [leaf("D")] : [];
    const forest = buildHistoryForest(sessions, tree);
    const b = forest[0].children[0]; // depth 1
    const c = b.children[0]; // depth 2
    expect(c).toMatchObject({ kind: "session", sessionId: "c", depth: 2 });
    expect(c.children).toEqual([]); // 깊이 2 에서 중단: D placeholder 도 없음
  });

  test("선행 트리에 없지만 시작된 하위 세션도 보존한다", () => {
    const sessions = [meta("a", "A"), meta("x", "직접추가", "a")];
    const forest = buildHistoryForest(sessions, () => []);
    expect(forest[0].children).toEqual([
      expect.objectContaining({ kind: "session", sessionId: "x", concept: "직접추가", depth: 1 }),
    ]);
  });
});
