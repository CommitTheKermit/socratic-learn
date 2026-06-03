import { describe, test, expect } from "vitest";
import { MERGEABLE_FIELDS, mergeSessions, stampFieldUpdatedAt } from "./sessionMerge";
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

const EARLIER = "2026-06-03T06:00:00.000Z";
const LATER = "2026-06-03T18:00:00.000Z";

describe("mergeSessions", () => {
  test("필드별로 더 최신 타임스탬프 쪽 값을 채택한다", () => {
    const a = baseState({
      stepIdx: 1,
      concept: "A개념",
      fieldUpdatedAt: { stepIdx: LATER, concept: EARLIER },
    });
    const b = baseState({
      stepIdx: 9,
      concept: "B개념",
      fieldUpdatedAt: { stepIdx: EARLIER, concept: LATER },
    });
    const merged = mergeSessions(a, b);
    expect(merged.stepIdx).toBe(1); // a 가 더 최신
    expect(merged.concept).toBe("B개념"); // b 가 더 최신
  });

  test("동률이면 a 를 채택한다(결정적 tiebreaker)", () => {
    const a = baseState({ stage: "learn", fieldUpdatedAt: { stage: NOW } });
    const b = baseState({ stage: "done", fieldUpdatedAt: { stage: NOW } });
    const merged = mergeSessions(a, b);
    expect(merged.stage).toBe("learn");
  });

  test("한쪽만 스탬프를 가지면 그쪽 값을 채택한다(단측 스탬프 보존)", () => {
    const a = baseState({ stepIdx: 1 });
    const b = baseState({ stepIdx: 7, fieldUpdatedAt: { stepIdx: NOW } });
    const merged = mergeSessions(a, b);
    expect(merged.stepIdx).toBe(7);
  });

  test("양측 스탬프 없으면 값이 정의된 쪽을 보존한다(단측 필드 보존)", () => {
    const a = baseState({ steps: undefined });
    const b = baseState({ steps: [{ id: 1, title: "t", desc: "", body: "x", questions: [] }] });
    const merged = mergeSessions(a, b);
    expect(merged.steps).toEqual([
      { id: 1, title: "t", desc: "", body: "x", questions: [] },
    ]);
  });

  test("결과 fieldUpdatedAt 는 필드별 최신 타임스탬프 합집합이다", () => {
    const a = baseState({ fieldUpdatedAt: { stepIdx: LATER, concept: EARLIER } });
    const b = baseState({ fieldUpdatedAt: { concept: LATER, stage: NOW } });
    const merged = mergeSessions(a, b);
    expect(merged.fieldUpdatedAt).toEqual({
      stepIdx: LATER,
      concept: LATER,
      stage: NOW,
    });
  });

  test("식별자 필드는 a 를 채택하되 누락 시 b 로 보정한다", () => {
    const a = baseState({ sessionId: "a-id", createdAt: 100 });
    const b = baseState({ sessionId: "b-id", createdAt: 200 });
    expect(mergeSessions(a, b).sessionId).toBe("a-id");
    expect(mergeSessions(a, b).createdAt).toBe(100);

    const aEmpty = baseState({ sessionId: "", createdAt: 0 });
    const merged = mergeSessions(aEmpty, b);
    expect(merged.sessionId).toBe("b-id");
    expect(merged.createdAt).toBe(200);
  });

  test("입력 상태를 변형하지 않는다(순수 함수)", () => {
    const a = baseState({ stepIdx: 1, fieldUpdatedAt: { stepIdx: LATER } });
    const b = baseState({ stepIdx: 2, fieldUpdatedAt: { stepIdx: EARLIER } });
    const snapA = JSON.stringify(a);
    const snapB = JSON.stringify(b);
    mergeSessions(a, b);
    expect(JSON.stringify(a)).toBe(snapA);
    expect(JSON.stringify(b)).toBe(snapB);
  });

  test("모든 mergeable 필드를 한쪽에서 채택해도 단일 SessionState 를 반환한다", () => {
    const a = baseState();
    const b = baseState({
      stepIdx: 42,
      stage: "done",
      fieldUpdatedAt: Object.fromEntries(MERGEABLE_FIELDS.map((f) => [f, LATER])),
    });
    const merged = mergeSessions(a, b);
    expect(merged.stepIdx).toBe(42);
    expect(merged.stage).toBe("done");
    expect(merged.sessionId).toBe("s-1");
  });
});
