import { describe, test, expect } from "vitest";
import {
  createSessionState,
  serializeSessionState,
  deserializeSessionState,
  type SessionState,
} from "./sessionState";
import { mergeSessions } from "./sessionMerge";

function baseChild(): SessionState {
  return createSessionState({
    sessionId: "child-1",
    createdAt: 1717000000000,
    concept: "포인터",
    mode: "socratic",
    parentSessionId: "parent-9",
  });
}

describe("선행 개념 하위 세션 parentSessionId", () => {
  test("createSessionState 는 parentSessionId 를 주면 하위 세션으로 표식한다", () => {
    const child = baseChild();
    expect(child.parentSessionId).toBe("parent-9");
    expect(child.stage).toBe("probe");
    expect(child.concept).toBe("포인터");
    expect(child.conceptSummary).toBe("포인터");
  });

  test("createSessionState 는 parentSessionId 미지정 시 키를 두지 않는다(최상위 세션)", () => {
    const top = createSessionState({
      sessionId: "top-1",
      createdAt: 1,
      concept: "재귀",
      mode: "deep",
    });
    expect("parentSessionId" in top).toBe(false);
    expect(top.parentSessionId).toBeUndefined();
  });

  test("직렬화/역직렬화 라운드트립이 parentSessionId 를 보존한다", () => {
    const restored = deserializeSessionState(serializeSessionState(baseChild()));
    expect(restored.parentSessionId).toBe("parent-9");
  });

  test("최상위 세션은 직렬화 JSON 에 parentSessionId 키를 생략한다", () => {
    const top = createSessionState({ sessionId: "t", createdAt: 1, concept: "x", mode: "light" });
    const json = serializeSessionState(top);
    expect(json.includes("parentSessionId")).toBe(false);
    expect(deserializeSessionState(json).parentSessionId).toBeUndefined();
  });

  test("손상/누락 입력은 parentSessionId 를 undefined 로 보정한다", () => {
    expect(deserializeSessionState(JSON.stringify({ sessionId: "a" })).parentSessionId).toBeUndefined();
    expect(
      deserializeSessionState(JSON.stringify({ sessionId: "a", parentSessionId: 42 })).parentSessionId,
    ).toBeUndefined();
    expect(
      deserializeSessionState(JSON.stringify({ sessionId: "a", parentSessionId: "" })).parentSessionId,
    ).toBeUndefined();
  });

  test("mergeSessions 는 불변 식별 필드 parentSessionId 를 어느 쪽에 있든 보존한다", () => {
    const a = baseChild();
    const bNoParent: SessionState = { ...baseChild(), parentSessionId: undefined };
    // b 에만 부모가 있어도 보존
    expect(mergeSessions(bNoParent, a).parentSessionId).toBe("parent-9");
    // a 에만 부모가 있어도 보존
    expect(mergeSessions(a, bNoParent).parentSessionId).toBe("parent-9");
    // 둘 다 없으면 undefined
    expect(mergeSessions(bNoParent, bNoParent).parentSessionId).toBeUndefined();
  });
});

describe("선행 개념 트리 prereqTree", () => {
  function withTree(): SessionState {
    return {
      ...createSessionState({ sessionId: "root-1", createdAt: 1, concept: "코루틴", mode: "socratic" }),
      prereqTree: [
        {
          concept: "동시성과 병렬성",
          reason: "차이부터 잡아야 함",
          children: [{ concept: "프로세스와 스레드", reason: "무엇 위에서 도는지", children: [] }],
        },
        { concept: "블로킹 I/O", reason: "기다림 문제의 출발점", children: [] },
      ],
    };
  }

  test("직렬화/역직렬화가 다단계 트리를 보존한다", () => {
    const restored = deserializeSessionState(serializeSessionState(withTree()));
    expect(restored.prereqTree).toHaveLength(2);
    expect(restored.prereqTree?.[0].children[0].concept).toBe("프로세스와 스레드");
    expect(restored.prereqTree?.[0].children[0].children).toEqual([]);
  });

  test("트리가 없으면 직렬화 JSON 에 prereqTree 키를 생략한다", () => {
    const json = serializeSessionState(
      createSessionState({ sessionId: "x", createdAt: 1, concept: "a", mode: "light" }),
    );
    expect(json.includes("prereqTree")).toBe(false);
  });

  test("손상 노드(concept 누락)는 걸러내고 reason/children 은 보정한다", () => {
    const restored = deserializeSessionState(
      JSON.stringify({ sessionId: "a", prereqTree: [{ reason: "no concept" }, { concept: "유효", x: 1 }] }),
    );
    expect(restored.prereqTree).toHaveLength(1);
    expect(restored.prereqTree?.[0]).toEqual({ concept: "유효", reason: "", children: [] });
  });

  test("mergeSessions 는 prereqTree 를 더 최신 스탬프 쪽으로 병합한다", () => {
    const older: SessionState = { ...withTree(), fieldUpdatedAt: { prereqTree: "2026-01-01T00:00:00.000Z" } };
    const newer: SessionState = {
      ...withTree(),
      prereqTree: [{ concept: "새 트리", reason: "", children: [] }],
      fieldUpdatedAt: { prereqTree: "2026-02-01T00:00:00.000Z" },
    };
    expect(mergeSessions(older, newer).prereqTree?.[0].concept).toBe("새 트리");
    expect(mergeSessions(newer, older).prereqTree?.[0].concept).toBe("새 트리");
  });
});
