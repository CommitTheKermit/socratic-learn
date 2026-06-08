import { describe, test, expect } from "vitest";
import {
  PLACEHOLDER_CATEGORIES,
  PLACEHOLDER_POOL,
  pickRandomPlaceholder,
} from "./placeholders";

describe("placeholder pool", () => {
  test("문구 풀이 비어있지 않다", () => {
    expect(PLACEHOLDER_POOL.length).toBeGreaterThan(0);
  });

  test("7개 카테고리 300개 문구를 합친 풀이다", () => {
    expect(PLACEHOLDER_CATEGORIES).toHaveLength(7);
    expect(PLACEHOLDER_POOL).toHaveLength(300);
    const sum = PLACEHOLDER_CATEGORIES.reduce((n, c) => n + c.phrases.length, 0);
    expect(sum).toBe(PLACEHOLDER_POOL.length);
  });

  test("모든 문구는 비어있지 않은 문자열이다", () => {
    for (const phrase of PLACEHOLDER_POOL) {
      expect(typeof phrase).toBe("string");
      expect(phrase.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("pickRandomPlaceholder", () => {
  test("항상 풀 범위 내 원소를 반환한다", () => {
    const pool = new Set(PLACEHOLDER_POOL);
    for (let i = 0; i < 1000; i++) {
      expect(pool.has(pickRandomPlaceholder())).toBe(true);
    }
  });

  test("커스텀 풀을 넘기면 그 풀에서만 선택한다", () => {
    const custom = ["가", "나", "다"];
    for (let i = 0; i < 100; i++) {
      expect(custom).toContain(pickRandomPlaceholder(custom));
    }
  });

  test("빈 풀이면 빈 문자열을 반환한다", () => {
    expect(pickRandomPlaceholder([])).toBe("");
  });
});
