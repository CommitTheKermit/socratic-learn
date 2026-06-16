import { describe, test, expect } from "vitest";
import { normalizeTitle } from "./learnTree";

describe("normalizeTitle", () => {
  // ---------------------------------------------------
  // Step 1: trim
  // ---------------------------------------------------
  describe("step 1 - trim: 앞뒤 공백 제거", () => {
    test("앞 공백 제거", () => {
      expect(normalizeTitle("  hello")).toBe("hello");
    });

    test("뒤 공백 제거", () => {
      expect(normalizeTitle("hello  ")).toBe("hello");
    });

    test("앞뒤 공백 동시 제거", () => {
      expect(normalizeTitle("  hello world  ")).toBe("hello world");
    });

    test("빈 문자열은 빈 문자열 반환", () => {
      expect(normalizeTitle("")).toBe("");
    });

    test("공백만 있으면 빈 문자열 반환", () => {
      expect(normalizeTitle("   ")).toBe("");
    });
  });

  // ---------------------------------------------------
  // Step 2: 소문자화
  // ---------------------------------------------------
  describe("step 2 - 소문자화: toLowerCase", () => {
    test("영문 대문자를 소문자로 변환", () => {
      expect(normalizeTitle("HELLO World")).toBe("hello world");
    });

    test("혼합 케이스 소문자화", () => {
      expect(normalizeTitle("Async/Await")).toBe("async/await");
    });

    test("한글은 소문자화 후에도 동일", () => {
      expect(normalizeTitle("코루틴")).toBe("코루틴");
    });

    test("영문+한글 혼합: 영문만 소문자화", () => {
      expect(normalizeTitle("Suspend 함수")).toBe("suspend 함수");
    });
  });

  // ---------------------------------------------------
  // Step 3: 내부 공백 단일화
  // ---------------------------------------------------
  describe("step 3 - 내부 공백 단일화: 연속 공백 -> 단일 스페이스", () => {
    test("연속 스페이스를 단일 스페이스로", () => {
      expect(normalizeTitle("hello   world")).toBe("hello world");
    });

    test("탭 포함 연속 공백도 단일 스페이스로", () => {
      expect(normalizeTitle("hello\t\tworld")).toBe("hello world");
    });

    test("단일 스페이스는 그대로 유지", () => {
      expect(normalizeTitle("hello world")).toBe("hello world");
    });

    test("여러 단어 사이 다중 공백 모두 정규화", () => {
      expect(normalizeTitle("a   b   c")).toBe("a b c");
    });
  });

  // ---------------------------------------------------
  // Step 4: 부제 제거 (': ' 또는 ' - ')
  // ---------------------------------------------------
  describe("step 4 - 부제 제거: 첫 구분자 뒤 제거", () => {
    test("': ' 구분자로 부제 제거", () => {
      expect(normalizeTitle("코루틴: 기초 개념")).toBe("코루틴");
    });

    test("' - ' 구분자로 부제 제거", () => {
      expect(normalizeTitle("코루틴 - 기초 개념")).toBe("코루틴");
    });

    test("구분자 없으면 전체 제목 반환", () => {
      expect(normalizeTitle("코루틴 기초")).toBe("코루틴 기초");
    });

    test("복수 구분자 시 첫 번째 기준으로 핵심 제목 추출", () => {
      // "A: B - C" -> 첫 구분자 ': ' 기준 -> "a"
      expect(normalizeTitle("A: B - C")).toBe("a");
    });

    test("' - ' 이 첫 번째면 그 기준 적용", () => {
      // "A - B: C" -> 첫 구분자 ' - ' 기준 -> "a"
      expect(normalizeTitle("A - B: C")).toBe("a");
    });

    test("단어 내부 하이픈('-')은 구분자가 아님 (공백 없으면 무시)", () => {
      expect(normalizeTitle("non-blocking 코루틴")).toBe("non-blocking 코루틴");
    });

    test("소문자화 후 구분자 탐지 (대문자 제목+구분자)", () => {
      expect(normalizeTitle("SUSPEND 함수: 코루틴 핵심")).toBe("suspend 함수");
    });

    test("내부 공백 정규화 후 ': ' 구분자 탐지 (콜론 앞뒤 다중 공백)", () => {
      // "코루틴   :  기초" -> normalize -> "코루틴 : 기초" -> match ': ' -> "코루틴"
      expect(normalizeTitle("코루틴   :  기초")).toBe("코루틴");
    });

    test("내부 공백 정규화 후 ' - ' 구분자 탐지 (하이픈 앞뒤 다중 공백)", () => {
      // "동시성  -  병렬성" -> normalize -> "동시성 - 병렬성" -> match ' - ' -> "동시성"
      expect(normalizeTitle("동시성  -  병렬성 비교")).toBe("동시성");
    });

    test("핵심 제목이 없고 구분자만 있으면 빈 문자열 반환", () => {
      expect(normalizeTitle(": 부제만 있는 경우")).toBe("");
    });
  });

  // ---------------------------------------------------
  // 통합: 실제 학습 단계 제목 예시
  // ---------------------------------------------------
  describe("통합 - 실제 학습 단계 제목 정규화", () => {
    test("'일시중단 함수: suspend의 의미' -> 핵심 제목만 반환", () => {
      expect(normalizeTitle("일시중단 함수: suspend의 의미")).toBe("일시중단 함수");
    });

    test("'Coroutine Builder - 기초' -> 소문자화 + 핵심 제목", () => {
      expect(normalizeTitle("Coroutine Builder - 기초")).toBe("coroutine builder");
    });

    test("'구조화된 동시성' -> 구분자 없어 그대로", () => {
      expect(normalizeTitle("구조화된 동시성")).toBe("구조화된 동시성");
    });

    test("동일 개념 다른 표기 -> 같은 정규화 키 생성 (isMerged 비교용)", () => {
      // "코루틴 기초" vs "코루틴 기초: 심화" -> 정규화하면 "코루틴 기초" 동일
      expect(normalizeTitle("코루틴 기초")).toBe(normalizeTitle("코루틴 기초: 심화 편"));
    });

    test("대소문자·공백만 다른 동일 개념 -> 같은 정규화 키", () => {
      // "  ASYNC/AWAIT  " -> "async/await"
      // "Async/Await: 기초" -> "async/await"
      expect(normalizeTitle("  ASYNC/AWAIT  ")).toBe(normalizeTitle("Async/Await: 기초"));
    });

    test("앞뒤 공백 + 대문자 + 구분자 복합", () => {
      expect(normalizeTitle("  Suspend 함수  :  핵심 정리  ")).toBe("suspend 함수");
    });
  });
});
