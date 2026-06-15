import { describe, test, expect } from "vitest";
import { normalizeStepTitle } from "./stepTitle";

// ---------------------------------------------------------------------------
// 단계별 독립 테스트 - 각 변환을 격리해 검증한다
// ---------------------------------------------------------------------------

describe("normalizeStepTitle - 단계 1: trim", () => {
  test("앞쪽 공백 제거", () => {
    expect(normalizeStepTitle("   hello")).toBe("hello");
  });

  test("뒤쪽 공백 제거", () => {
    expect(normalizeStepTitle("hello   ")).toBe("hello");
  });

  test("양쪽 공백 제거", () => {
    expect(normalizeStepTitle("   hello   ")).toBe("hello");
  });

  test("공백만 있는 문자열 -> 빈 문자열", () => {
    expect(normalizeStepTitle("     ")).toBe("");
  });

  test("빈 문자열 -> 빈 문자열", () => {
    expect(normalizeStepTitle("")).toBe("");
  });
});

describe("normalizeStepTitle - 단계 2: 소문자화", () => {
  test("대문자 -> 소문자", () => {
    expect(normalizeStepTitle("REACT")).toBe("react");
  });

  test("혼합 대소문자 -> 소문자", () => {
    expect(normalizeStepTitle("Async Await")).toBe("async await");
  });

  test("이미 소문자인 경우 유지", () => {
    expect(normalizeStepTitle("suspend")).toBe("suspend");
  });

  test("한글은 소문자화 영향 없음", () => {
    expect(normalizeStepTitle("동시성과 병렬성")).toBe("동시성과 병렬성");
  });
});

describe("normalizeStepTitle - 단계 3: 내부 공백 단일화", () => {
  test("연속 공백 -> 단일 공백", () => {
    expect(normalizeStepTitle("hello   world")).toBe("hello world");
  });

  test("탭 포함 연속 공백 -> 단일 공백", () => {
    expect(normalizeStepTitle("hello\t\tworld")).toBe("hello world");
  });

  test("이미 단일 공백인 경우 유지", () => {
    expect(normalizeStepTitle("hello world")).toBe("hello world");
  });

  test("앞뒤 공백 + 내부 다중 공백 모두 처리", () => {
    expect(normalizeStepTitle("  react   hooks  ")).toBe("react hooks");
  });
});

describe("normalizeStepTitle - 단계 4: 첫 구분자 이후 부제 제거", () => {
  test("콜론으로 구분된 부제 제거", () => {
    expect(normalizeStepTitle("동시성과 병렬성: 핵심 개념")).toBe(
      "동시성과 병렬성"
    );
  });

  test("콜론 앞뒤 공백 포함된 경우 처리", () => {
    expect(normalizeStepTitle("React Hooks : Deep Dive")).toBe("react hooks");
  });

  test("콜론 뒤에 바로 붙은 경우 처리", () => {
    expect(normalizeStepTitle("Step 1:Introduction")).toBe("step 1");
  });

  test("공백 감싼 하이픈으로 구분된 부제 제거", () => {
    expect(normalizeStepTitle("suspend 함수 - 코루틴 핵심")).toBe("suspend 함수");
  });

  test("복합어 하이픈(공백 없음)은 보존", () => {
    expect(normalizeStepTitle("async/await-based approach")).toBe(
      "async/await-based approach"
    );
  });

  test("부제 없는 제목은 그대로 반환", () => {
    expect(normalizeStepTitle("스레드의 비용")).toBe("스레드의 비용");
  });

  test("구분자가 여러 개 있어도 첫 번째만 제거", () => {
    expect(normalizeStepTitle("A: B: C")).toBe("a");
  });

  test("구분자가 여러 개 혼합 - 첫 번째 기준", () => {
    expect(normalizeStepTitle("A: B - C")).toBe("a");
  });
});

// ---------------------------------------------------------------------------
// 완전한 파이프라인 테스트 - 실제 학습 제목 시나리오
// ---------------------------------------------------------------------------

describe("normalizeStepTitle - 완전 파이프라인", () => {
  test("앞뒤 공백 + 대문자 + 콜론 부제 제거", () => {
    expect(normalizeStepTitle("  React Hooks: Deep Dive  ")).toBe("react hooks");
  });

  test("연속 공백 + 하이픈 부제 제거", () => {
    // 파이프라인: trim -> lowercase -> 공백단일화("async await - understanding")
    //             -> 구분자 " - " 제거 -> "async await"
    expect(normalizeStepTitle("  Async  Await  -  Understanding  ")).toBe(
      "async await"
    );
  });

  test("파이프라인 순서 검증: 내부 공백 정리 후 구분자 탐색", () => {
    // "Async  Await - Sub" -> trim -> lowercase -> 공백단일화 -> "async await - sub"
    // -> 구분자 " - " 제거 -> "async await"
    expect(normalizeStepTitle("Async  Await - Sub")).toBe("async await");
  });

  test("한글 제목 + 콜론 부제", () => {
    expect(normalizeStepTitle("  일시중단 함수: 코루틴의 핵심 도구  ")).toBe(
      "일시중단 함수"
    );
  });

  test("AI 생성 스텝 제목 시나리오 - 동일 개념 정규화", () => {
    // "동시성과 병렬성 - 기초 개념" vs "동시성과 병렬성"
    expect(normalizeStepTitle("동시성과 병렬성 - 기초 개념")).toBe(
      "동시성과 병렬성"
    );
    expect(normalizeStepTitle("동시성과 병렬성")).toBe("동시성과 병렬성");
  });

  test("이미 정규화된 제목은 변화 없음", () => {
    expect(normalizeStepTitle("코루틴이 가벼운 이유")).toBe(
      "코루틴이 가벼운 이유"
    );
  });
});
