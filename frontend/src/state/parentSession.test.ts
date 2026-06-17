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
