import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { StepChipsBar } from "./StepChipsBar";
import type { Step } from "../../stages/data";

const steps: Step[] = [
  { id: 1, title: "동시성", desc: "", body: "", questions: [] },
  { id: 2, title: "스레드 비용", desc: "", body: "", questions: [] },
  { id: 99, title: "보강", desc: "", body: "", questions: [] },
  { id: 3, title: "일시중단 함수", desc: "", body: "", questions: [] },
];

describe("StepChipsBar - 동적 칩 삽입 시안 A (점선 보더 + ↳ prefix)", () => {
  test("steps 개수만큼 칩이 렌더된다", () => {
    const { container } = render(
      <StepChipsBar steps={steps} currentIndex={0} insertedIds={new Set([99])} />
    );
    expect(container.querySelectorAll(".pb-seg").length).toBe(4);
  });

  test("insertedIds 에 속한 step 칩에 is-inserted 클래스가 부여된다", () => {
    const { container } = render(
      <StepChipsBar steps={steps} currentIndex={2} insertedIds={new Set([99])} />
    );
    const inserted = container.querySelectorAll(".pb-seg.is-inserted");
    expect(inserted.length).toBe(1);
    expect(inserted[0].textContent).toContain("보강");
  });

  test("insertedIds 없으면 모든 칩이 is-inserted 가 아니다", () => {
    const { container } = render(
      <StepChipsBar steps={steps} currentIndex={0} />
    );
    expect(container.querySelectorAll(".pb-seg.is-inserted").length).toBe(0);
  });

  test("currentIndex 이전은 done, 같은 곳은 curr, 이후는 todo 상태", () => {
    const { container } = render(
      <StepChipsBar steps={steps} currentIndex={1} />
    );
    const segs = container.querySelectorAll(".pb-seg");
    expect(segs[0].className).toContain("is-done");
    expect(segs[1].className).toContain("is-curr");
    expect(segs[2].className).toContain("is-todo");
    expect(segs[3].className).toContain("is-todo");
  });
});

describe("StepChipsBar - getLabelForStep 라벨 텍스트 검증", () => {
  test("원본 단계들은 zero-pad 없이 정수 라벨을 표시한다", () => {
    const mainSteps: Step[] = [
      { id: 10, title: "첫 번째", desc: "", body: "", questions: [] },
      { id: 20, title: "두 번째", desc: "", body: "", questions: [] },
      { id: 30, title: "세 번째", desc: "", body: "", questions: [] },
    ];
    const { container } = render(
      <StepChipsBar steps={mainSteps} currentIndex={0} />
    );
    const nums = container.querySelectorAll(".pb-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("2");
    expect(nums[2].textContent).toBe("3");
  });

  test("원본 단계 라벨에 zero-pad(01, 02)가 없다", () => {
    const mainSteps: Step[] = [
      { id: 1, title: "A", desc: "", body: "", questions: [] },
      { id: 2, title: "B", desc: "", body: "", questions: [] },
    ];
    const { container } = render(
      <StepChipsBar steps={mainSteps} currentIndex={0} />
    );
    const nums = container.querySelectorAll(".pb-num");
    expect(nums[0].textContent).not.toBe("01");
    expect(nums[1].textContent).not.toBe("02");
  });

  test("삽입(분기) 단계는 계층형 십진수 라벨을 표시한다 (1.1, 1.2...)", () => {
    const mixedSteps: Step[] = [
      { id: 1, title: "메인1", desc: "", body: "", questions: [] },
      {
        id: 101,
        title: "분기1-1",
        desc: "",
        body: "",
        questions: [],
        _meta: { parentMainStepId: 1, siblingIndex: 0 },
      },
      {
        id: 102,
        title: "분기1-2",
        desc: "",
        body: "",
        questions: [],
        _meta: { parentMainStepId: 1, siblingIndex: 1 },
      },
      { id: 2, title: "메인2", desc: "", body: "", questions: [] },
    ];
    const { container } = render(
      <StepChipsBar steps={mixedSteps} currentIndex={0} />
    );
    const nums = container.querySelectorAll(".pb-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
    expect(nums[2].textContent).toBe("1.2");
    expect(nums[3].textContent).toBe("2");
  });

  test("원본과 분기 혼합: 원본 순번이 건너뛰지 않는다", () => {
    const mixedSteps: Step[] = [
      { id: 10, title: "메인1", desc: "", body: "", questions: [] },
      {
        id: 100,
        title: "보강",
        desc: "",
        body: "",
        questions: [],
        _meta: { parentMainStepId: 10, siblingIndex: 0 },
      },
      { id: 20, title: "메인2", desc: "", body: "", questions: [] },
      { id: 30, title: "메인3", desc: "", body: "", questions: [] },
    ];
    const { container } = render(
      <StepChipsBar steps={mixedSteps} currentIndex={0} />
    );
    const nums = container.querySelectorAll(".pb-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
    expect(nums[2].textContent).toBe("2");
    expect(nums[3].textContent).toBe("3");
  });
});
