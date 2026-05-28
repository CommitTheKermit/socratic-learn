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
