import { describe, test, expect } from "vitest";
import { sessionListsEqual } from "../state/sessionIndex";
import type { SessionMeta } from "../state/sessionIndex";

/**
 * AC: listSessions 결과의 항목 집합이 직전과 동일하면 sessions state 가 동일 배열 참조를 유지한다.
 * Object.is(prevSessions, nextSessions) === true 로 검증.
 *
 * sessionListsEqual 이 true 를 반환할 때 호출 측이 prev 를 그대로 반환하면
 * Object.is(prev, prev) === true 가 보장된다.
 */

function meta(
  sessionId: string,
  stage: SessionMeta["stage"] = "learn",
  conceptSummary = "개념",
  createdAt = 1000,
): SessionMeta {
  return { sessionId, stage, conceptSummary, createdAt };
}

describe("sessionListsEqual - 참조 안정성 판별", () => {
  test("빈 배열끼리는 동일(true)", () => {
    expect(sessionListsEqual([], [])).toBe(true);
  });

  test("동일 항목 배열은 true - Object.is 패턴 검증", () => {
    const prev: SessionMeta[] = [
      meta("s-1", "learn", "코루틴", 2000),
      meta("s-2", "done", "클로저", 1000),
    ];
    const next: SessionMeta[] = [
      meta("s-1", "learn", "코루틴", 2000),
      meta("s-2", "done", "클로저", 1000),
    ];

    // sessionListsEqual 이 true 이면 prev 참조를 그대로 반환 → Object.is 보장
    const result = sessionListsEqual(prev, next) ? prev : next;
    expect(Object.is(prev, result)).toBe(true);
  });

  test("길이가 다르면 false", () => {
    const a = [meta("s-1")];
    const b = [meta("s-1"), meta("s-2")];
    expect(sessionListsEqual(a, b)).toBe(false);
    expect(sessionListsEqual(b, a)).toBe(false);
  });

  test("sessionId 다르면 false", () => {
    const a = [meta("s-1", "learn", "개념", 1000)];
    const b = [meta("s-2", "learn", "개념", 1000)];
    expect(sessionListsEqual(a, b)).toBe(false);
  });

  test("stage 다르면 false", () => {
    const a = [meta("s-1", "learn", "개념", 1000)];
    const b = [meta("s-1", "done", "개념", 1000)];
    expect(sessionListsEqual(a, b)).toBe(false);
  });

  test("conceptSummary 다르면 false", () => {
    const a = [meta("s-1", "learn", "개념 A", 1000)];
    const b = [meta("s-1", "learn", "개념 B", 1000)];
    expect(sessionListsEqual(a, b)).toBe(false);
  });

  test("createdAt 다르면 false", () => {
    const a = [meta("s-1", "learn", "개념", 1000)];
    const b = [meta("s-1", "learn", "개념", 2000)];
    expect(sessionListsEqual(a, b)).toBe(false);
  });

  test("순서가 다르면 false", () => {
    const a = [meta("s-1"), meta("s-2")];
    const b = [meta("s-2"), meta("s-1")];
    expect(sessionListsEqual(a, b)).toBe(false);
  });

  test("stage 만 변경된 경우 false - 활성 항목 라벨 갱신 시 목록 교체됨", () => {
    const prev: SessionMeta[] = [meta("s-1", "learn", "코루틴", 2000)];
    const next: SessionMeta[] = [meta("s-1", "done", "코루틴", 2000)];

    const result = sessionListsEqual(prev, next) ? prev : next;
    // stage 가 달라졌으므로 새 배열(next)로 교체되어야 한다
    expect(Object.is(prev, result)).toBe(false);
    expect(Object.is(next, result)).toBe(true);
  });

  test("완전히 동일한 다항목 배열은 true", () => {
    const items = [
      meta("s-1", "probe", "리액트", 3000),
      meta("s-2", "learn", "코루틴", 2000),
      meta("s-3", "done", "클로저", 1000),
    ];
    expect(sessionListsEqual(items, [...items.map((m) => ({ ...m }))])).toBe(true);
  });
});
