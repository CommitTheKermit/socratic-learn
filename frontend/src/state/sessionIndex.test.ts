import { describe, test, expect } from "vitest";
import {
  getSessionItemKey,
  sessionListsEqual,
  type SessionMeta,
} from "./sessionIndex";

describe("getSessionItemKey - 안정 key 도출 순수 함수", () => {
  test("sessionId 를 key 로 반환한다", () => {
    const s: SessionMeta = {
      sessionId: "s-abc123",
      createdAt: 1000,
      conceptSummary: "코루틴이 왜 필요한지",
      stage: "probe",
    };
    expect(getSessionItemKey(s)).toBe("s-abc123");
  });

  test("단계 변경 전후 key 가 변하지 않는다 - probe -> learn", () => {
    const sessionId = "s-stable-1";
    const before: SessionMeta = {
      sessionId,
      createdAt: 2000,
      conceptSummary: "제네릭 분산",
      stage: "probe",
    };
    const after: SessionMeta = {
      ...before,
      stage: "learn",
    };
    expect(getSessionItemKey(before)).toBe(getSessionItemKey(after));
  });

  test("단계 변경 전후 key 가 변하지 않는다 - learn -> done", () => {
    const sessionId = "s-stable-2";
    const before: SessionMeta = {
      sessionId,
      createdAt: 3000,
      conceptSummary: "타입 추론 원리",
      stage: "learn",
    };
    const after: SessionMeta = {
      ...before,
      stage: "done",
    };
    expect(getSessionItemKey(before)).toBe(getSessionItemKey(after));
  });

  test("모든 단계(input/probe/learn/done) 를 거쳐도 key 는 sessionId 로 고정된다", () => {
    const sessionId = "s-all-stages";
    const stages = ["input", "probe", "learn", "done"] as const;
    const keys = stages.map((stage) =>
      getSessionItemKey({ sessionId, createdAt: 100, conceptSummary: "X", stage }),
    );
    expect(keys.every((k) => k === sessionId)).toBe(true);
  });

  test("conceptSummary 가 바뀌어도 key 는 변하지 않는다", () => {
    const sessionId = "s-concept-change";
    const before: SessionMeta = {
      sessionId,
      createdAt: 4000,
      conceptSummary: "원래 개념",
      stage: "probe",
    };
    const after: SessionMeta = {
      ...before,
      conceptSummary: "바뀐 개념",
    };
    expect(getSessionItemKey(before)).toBe(getSessionItemKey(after));
  });

  test("순수 함수: 동일 입력은 항상 동일 출력을 반환한다", () => {
    const s: SessionMeta = {
      sessionId: "s-pure",
      createdAt: 5000,
      conceptSummary: "순수 함수 테스트",
      stage: "done",
    };
    const first = getSessionItemKey(s);
    const second = getSessionItemKey(s);
    const third = getSessionItemKey(s);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });
});

describe("sessionListsEqual - 참조 안정성 판별 순수 함수", () => {
  test("빈 배열 둘은 같다", () => {
    expect(sessionListsEqual([], [])).toBe(true);
  });

  test("길이가 다르면 false", () => {
    const s: SessionMeta = { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "probe" };
    expect(sessionListsEqual([s], [])).toBe(false);
    expect(sessionListsEqual([], [s])).toBe(false);
  });

  test("4필드(sessionId/stage/conceptSummary/createdAt) 모두 같으면 true", () => {
    const a: SessionMeta[] = [
      { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "probe" },
      { sessionId: "s2", createdAt: 2, conceptSummary: "B", stage: "done" },
    ];
    const b: SessionMeta[] = [
      { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "probe" },
      { sessionId: "s2", createdAt: 2, conceptSummary: "B", stage: "done" },
    ];
    expect(sessionListsEqual(a, b)).toBe(true);
  });

  test("stage 만 다르면 false", () => {
    const a: SessionMeta[] = [
      { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "probe" },
    ];
    const b: SessionMeta[] = [
      { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "learn" },
    ];
    expect(sessionListsEqual(a, b)).toBe(false);
  });

  test("true 반환 시 이전 배열 참조를 재사용하면 Object.is 동일성이 보장된다", () => {
    const prev: SessionMeta[] = [
      { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "probe" },
    ];
    const next: SessionMeta[] = [
      { sessionId: "s1", createdAt: 1, conceptSummary: "A", stage: "probe" },
    ];
    // sessionListsEqual 이 true 면 이전 참조를 그대로 돌려야 한다(호출 측 책임).
    // 여기서는 해당 패턴이 올바름을 검증한다.
    const result = sessionListsEqual(prev, next) ? prev : next;
    expect(Object.is(result, prev)).toBe(true);
  });
});
