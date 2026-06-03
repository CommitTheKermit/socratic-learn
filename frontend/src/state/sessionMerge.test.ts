import { describe, test, expect } from "vitest";
import { MERGEABLE_FIELDS, stampFieldUpdatedAt } from "./sessionMerge";
import type { SessionState } from "./sessionState";

function baseState(over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: "s-1",
    createdAt: 1717000000000,
    conceptSummary: "코루틴",
    stage: "learn",
    depth: "1depth",
    concept: "코루틴",
    materials: "자료",
    probes: { p1: 2, p2: ["thread"], p3: "비동기" },
    estimatedLevel: 3,
    stepIdx: 1,
    answers: { "1-1": "a" },
    skips: {},
    ...over,
  };
}

const T0 = "2026-06-03T00:00:00.000Z";
const NOW = "2026-06-03T12:00:00.000Z";

describe("stampFieldUpdatedAt", () => {
  test("변경된 최상위 필드만 nowIso 로 갱신한다", () => {
    const prev = baseState();
    const next = baseState({ stepIdx: 2 });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped.stepIdx).toBe(NOW);
    // 변경되지 않은 필드는 스탬프가 생기지 않는다(prev 에 없었으므로).
    expect(stamped.concept).toBeUndefined();
    expect(stamped.answers).toBeUndefined();
  });

  test("변경되지 않은 필드의 기존 타임스탬프는 보존한다", () => {
    const prev = baseState({
      fieldUpdatedAt: { concept: T0, stepIdx: T0, answers: T0 },
    });
    const next = baseState({ stepIdx: 2 });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped.stepIdx).toBe(NOW); // 변경됨 → 갱신
    expect(stamped.concept).toBe(T0); // 미변경 → 보존
    expect(stamped.answers).toBe(T0); // 미변경 → 보존
  });

  test("prev.fieldUpdatedAt 누락 시 빈 객체로 안전 보정한다", () => {
    const prev = baseState();
    expect(prev.fieldUpdatedAt).toBeUndefined();
    const next = baseState({ stage: "done" });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped).toEqual({ stage: NOW });
  });

  test("값 변경이 없으면 기존 스탬프 맵을 그대로 반환한다", () => {
    const prev = baseState({ fieldUpdatedAt: { stage: T0 } });
    const next = baseState();
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped).toEqual({ stage: T0 });
  });

  test("맵 필드(answers)는 통째로 1개 필드로 변경을 판정한다", () => {
    const prev = baseState({ answers: { "1-1": "a" } });
    const next = baseState({ answers: { "1-1": "a", "2-1": "b" } });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped.answers).toBe(NOW);
    expect(stamped.stepIdx).toBeUndefined();
  });

  test("맵 내용이 키 순서만 다르고 동일하면 변경으로 보지 않는다", () => {
    const prev = baseState({ probes: { p1: 2, p2: ["thread"], p3: "비동기" } });
    const next = baseState({ probes: { p3: "비동기", p2: ["thread"], p1: 2 } });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped.probes).toBeUndefined();
  });

  test("estimatedLevel null 과 숫자 차이를 변경으로 감지한다", () => {
    const prev = baseState({ estimatedLevel: null });
    const next = baseState({ estimatedLevel: 4 });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped.estimatedLevel).toBe(NOW);
  });

  test("입력 상태를 변형하지 않는다(순수 함수)", () => {
    const prevStamp = { stage: T0 };
    const prev = baseState({ fieldUpdatedAt: prevStamp });
    const next = baseState({ stepIdx: 9 });
    stampFieldUpdatedAt(prev, next, NOW);
    expect(prev.fieldUpdatedAt).toEqual({ stage: T0 });
    expect(prevStamp).toEqual({ stage: T0 });
  });

  test("여러 필드 동시 변경 시 모두 nowIso 로 스탬핑한다", () => {
    const prev = baseState();
    const next = baseState({ stepIdx: 5, stage: "done", concept: "변경" });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped).toEqual({ stepIdx: NOW, stage: NOW, concept: NOW });
  });

  test("sessionId/createdAt 변경은 스탬핑 대상이 아니다", () => {
    expect(MERGEABLE_FIELDS).not.toContain("sessionId");
    expect(MERGEABLE_FIELDS).not.toContain("createdAt");
    const prev = baseState();
    const next = baseState({ sessionId: "other", createdAt: 99 });
    const stamped = stampFieldUpdatedAt(prev, next, NOW);
    expect(stamped).toEqual({});
  });
});
