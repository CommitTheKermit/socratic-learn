import { describe, test, expect } from "vitest";
import { buildHistoryForest } from "./historyForest";
import type { SessionMeta } from "./sessionIndex";

function meta(sessionId: string, conceptSummary: string, parentSessionId?: string): SessionMeta {
  return { sessionId, conceptSummary, stage: "learn", createdAt: 1, parentSessionId };
}

describe("buildHistoryForest", () => {
  test("부모 없는 세션은 모두 루트(depth 0)", () => {
    const forest = buildHistoryForest([meta("a", "A"), meta("b", "B")]);
    expect(forest).toHaveLength(2);
    expect(forest.every((n) => n.depth === 0 && n.children.length === 0)).toBe(true);
  });

  test("실제 시작된 하위 세션만 부모 아래로 중첩한다(미시작 선행 placeholder 없음)", () => {
    const sessions = [meta("a", "코루틴"), meta("b", "동시성", "a")];
    const forest = buildHistoryForest(sessions);
    expect(forest).toHaveLength(1); // 하위 세션은 루트로 중복 노출되지 않음
    const kids = forest[0].children;
    expect(kids).toHaveLength(1);
    expect(kids[0]).toMatchObject({ sessionId: "b", concept: "동시성", depth: 1 });
  });

  test("깊이 2 까지만 중첩한다(그 아래는 children 비움)", () => {
    const sessions = [meta("a", "A"), meta("b", "B", "a"), meta("c", "C", "b")];
    const forest = buildHistoryForest(sessions);
    const b = forest[0].children[0]; // depth 1
    const c = b.children[0]; // depth 2
    expect(c).toMatchObject({ sessionId: "c", depth: 2 });
    expect(c.children).toEqual([]); // 깊이 2 에서 중단
  });

  test("부모가 없는(고아) 하위 참조는 루트로 보존되지 않고 누락 부모 아래로만 시도된다", () => {
    // 부모 a 가 목록에 있으면 그 아래로, 없으면 어디에도 안 붙는다(루트 필터는 parentSessionId 유무 기준).
    const sessions = [meta("a", "A"), meta("x", "직접추가", "a")];
    const forest = buildHistoryForest(sessions);
    expect(forest).toHaveLength(1);
    expect(forest[0].children).toEqual([
      expect.objectContaining({ sessionId: "x", concept: "직접추가", depth: 1 }),
    ]);
  });
});
