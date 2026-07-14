import { describe, test, expect } from "vitest";
import { evalQuestionText, choiceAnswerText, type StepQuestion } from "./data";

describe("evalQuestionText", () => {
  test("서술형(choices 없음)은 q 그대로 반환한다", () => {
    const q: StepQuestion = { id: "1-1", q: "동시성과 병렬성의 차이는?" };
    expect(evalQuestionText(q)).toBe("동시성과 병렬성의 차이는?");
  });

  test("객관식은 q 뒤에 숫자 붙은 선택지 목록을 덧붙인다", () => {
    const q: StepQuestion = {
      id: "1-2",
      q: "다음 중 코루틴의 특징이 아닌 것은?",
      choices: ["상태 객체", "1MB 콜스택", "일시중단"],
    };
    expect(evalQuestionText(q)).toBe(
      "다음 중 코루틴의 특징이 아닌 것은?\n선택지: 1. 상태 객체 / 2. 1MB 콜스택 / 3. 일시중단",
    );
  });

  test("빈 choices 배열은 서술형으로 취급한다", () => {
    const q: StepQuestion = { id: "1-3", q: "질문", choices: [] };
    expect(evalQuestionText(q)).toBe("질문");
  });
});

describe("choiceAnswerText", () => {
  test("0-based index 를 1-based 번호로 붙인다", () => {
    expect(choiceAnswerText(0, "첫 선택지")).toBe("1. 첫 선택지");
    expect(choiceAnswerText(2, "셋째")).toBe("3. 셋째");
  });
});
