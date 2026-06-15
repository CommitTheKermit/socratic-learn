import { describe, test, expect } from "vitest";
import { normalizeStepTitle, isDuplicateStep } from "./stepTitle";

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

// ---------------------------------------------------------------------------
// isDuplicateStep 테스트
// ---------------------------------------------------------------------------

describe("isDuplicateStep - 일치 케이스", () => {
  test("완전히 동일한 제목이면 true", () => {
    expect(
      isDuplicateStep("동시성과 병렬성", ["동시성과 병렬성", "스레드의 비용"])
    ).toBe(true);
  });

  test("부제가 다른 동일 개념 제목이면 true", () => {
    // candidate: "동시성과 병렬성: 기초 개념" -> normalize -> "동시성과 병렬성"
    // roadmap:   "동시성과 병렬성"             -> normalize -> "동시성과 병렬성"
    expect(
      isDuplicateStep("동시성과 병렬성: 기초 개념", ["동시성과 병렬성"])
    ).toBe(true);
  });

  test("로드맵 항목에 부제가 있고 candidate 가 핵심만인 경우도 true", () => {
    // roadmap: "동시성과 병렬성 - 핵심 개념" -> normalize -> "동시성과 병렬성"
    // candidate: "동시성과 병렬성"            -> normalize -> "동시성과 병렬성"
    expect(
      isDuplicateStep("동시성과 병렬성", ["동시성과 병렬성 - 핵심 개념"])
    ).toBe(true);
  });

  test("배열 중간 항목과 일치해도 true", () => {
    expect(
      isDuplicateStep("스레드의 비용", [
        "동시성과 병렬성",
        "스레드의 비용",
        "일시중단 함수",
      ])
    ).toBe(true);
  });
});

describe("isDuplicateStep - 불일치 케이스", () => {
  test("배열에 없는 제목이면 false", () => {
    expect(
      isDuplicateStep("코루틴이 가벼운 이유", [
        "동시성과 병렬성",
        "스레드의 비용",
      ])
    ).toBe(false);
  });

  test("빈 배열이면 항상 false", () => {
    expect(isDuplicateStep("동시성과 병렬성", [])).toBe(false);
  });

  test("핵심 단어가 비슷해도 정규화 결과가 다르면 false", () => {
    // "동시성" vs "동시성과 병렬성" - 다른 제목
    expect(isDuplicateStep("동시성", ["동시성과 병렬성"])).toBe(false);
  });
});

describe("isDuplicateStep - 대소문자 혼합 케이스", () => {
  test("candidate 가 대문자여도 로드맵 소문자와 일치하면 true", () => {
    expect(isDuplicateStep("REACT HOOKS", ["react hooks", "스레드의 비용"])).toBe(
      true
    );
  });

  test("로드맵이 대문자여도 candidate 소문자와 일치하면 true", () => {
    expect(isDuplicateStep("react hooks", ["REACT HOOKS"])).toBe(true);
  });

  test("혼합 대소문자 양쪽이 정규화 후 일치하면 true", () => {
    expect(isDuplicateStep("Async Await", ["async await"])).toBe(true);
  });

  test("대소문자만 다른 동일 개념 - 부제까지 포함", () => {
    // "React Hooks: Deep Dive" -> normalize -> "react hooks"
    // "react hooks"            -> normalize -> "react hooks"
    expect(
      isDuplicateStep("React Hooks: Deep Dive", ["react hooks"])
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 특수문자 엣지 케이스 - Sub-AC 2 명시 요건
// ---------------------------------------------------------------------------

describe("normalizeStepTitle - 특수문자 엣지 케이스", () => {
  test("빈 문자열은 빈 문자열을 반환한다", () => {
    expect(normalizeStepTitle("")).toBe("");
  });

  test("공백만 있는 문자열은 빈 문자열을 반환한다", () => {
    expect(normalizeStepTitle("   ")).toBe("");
  });

  test("줄바꿈(\\n)은 공백으로 처리된다", () => {
    // \n 은 \s+ 패턴에 포함되어 단일 공백으로 대체된다
    expect(normalizeStepTitle("hello\nworld")).toBe("hello world");
  });

  test("캐리지리턴+줄바꿈(\\r\\n)은 공백으로 처리된다", () => {
    expect(normalizeStepTitle("hello\r\nworld")).toBe("hello world");
  });

  test("탭(\\t)은 공백으로 처리된다", () => {
    expect(normalizeStepTitle("hello\tworld")).toBe("hello world");
  });

  test("앞뒤 줄바꿈은 trim 에서 제거된다", () => {
    expect(normalizeStepTitle("\nhello world\n")).toBe("hello world");
  });

  test("느낌표(!)는 비구분자 - 보존된다", () => {
    expect(normalizeStepTitle("hello!")).toBe("hello!");
  });

  test("물음표(?)는 비구분자 - 보존된다", () => {
    expect(normalizeStepTitle("what is async?")).toBe("what is async?");
  });

  test("해시(#)는 비구분자 - 보존된다", () => {
    expect(normalizeStepTitle("C# 기초")).toBe("c# 기초");
  });

  test("괄호는 비구분자 - 보존된다", () => {
    expect(normalizeStepTitle("함수형 프로그래밍 (FP 개요)")).toBe(
      "함수형 프로그래밍 (fp 개요)"
    );
  });

  test("슬래시(/)는 비구분자 - 보존된다", () => {
    expect(normalizeStepTitle("async/await 패턴")).toBe("async/await 패턴");
  });

  test("퍼센트(%)는 비구분자 - 보존된다", () => {
    expect(normalizeStepTitle("CPU 사용률 100% 이해")).toBe(
      "cpu 사용률 100% 이해"
    );
  });

  test("중복 공백 + 특수문자 혼합 - 공백 단일화 후 특수문자 보존", () => {
    expect(normalizeStepTitle("hello   world!")).toBe("hello world!");
  });

  test("콜론 이후 특수문자가 있는 부제는 콜론 기준 제거", () => {
    // "async/await: #기초 개념!" -> normalize -> "async/await"
    expect(normalizeStepTitle("async/await: #기초 개념!")).toBe("async/await");
  });

  test("특수문자로만 이루어진 문자열은 그대로 반환", () => {
    expect(normalizeStepTitle("!@#$%^&*")).toBe("!@#$%^&*");
  });

  test("숫자와 특수문자 혼합 - 소문자화 영향 없이 보존", () => {
    // 숫자와 ! 는 소문자화 대상 아님, 그대로 유지
    expect(normalizeStepTitle("Step 1! - 도입")).toBe("step 1!");
  });

  test("연속 중복 공백과 다수 특수문자 혼합 파이프라인", () => {
    // trim -> lowercase -> 공백단일화("c# basics  (oop)") -> 구분자 없음 -> 그대로
    expect(normalizeStepTitle("  C#   Basics  (OOP)  ")).toBe("c# basics (oop)");
  });
});
