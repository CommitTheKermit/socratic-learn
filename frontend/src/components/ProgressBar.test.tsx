import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";
import type { Step } from "../stages/data";

// useLearnContent 를 모킹해 steps 를 주입할 수 있게 함
vi.mock("../state/LearnContent", () => ({
  useLearnContent: vi.fn(),
}));

import { useLearnContent } from "../state/LearnContent";

const mockUseLearnContent = vi.mocked(useLearnContent);

function mainStep(id: number): Step {
  return { id, title: `Step ${id}`, desc: "", body: "", questions: [] };
}

function branchStep(id: number, parentMainStepId: number, siblingIndex: number): Step {
  return {
    id,
    title: `Branch ${id}`,
    desc: "",
    body: "",
    questions: [],
    _meta: { parentMainStepId, siblingIndex },
  };
}

/** steps 를 주입해 ProgressBar 를 learn 단계에서 렌더한다 */
function renderLearnBar(steps: Step[], stepIdx: number) {
  mockUseLearnContent.mockReturnValue({ steps } as ReturnType<typeof useLearnContent>);
  return render(<ProgressBar stage="learn" stepIdx={stepIdx} />);
}

describe("ProgressBar - getLabelForStep import 및 단계 라벨 표시", () => {
  beforeEach(() => {
    mockUseLearnContent.mockReturnValue({ steps: [] } as ReturnType<typeof useLearnContent>);
  });

  test("원본 단계 3개 중 첫 번째(인덱스 0)는 '개념 1/3'을 표시한다", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    renderLearnBar(steps, 0);
    expect(screen.getByText("개념 1/3")).toBeInTheDocument();
  });

  test("원본 단계 3개 중 두 번째(인덱스 1)는 '개념 2/3'을 표시한다", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    renderLearnBar(steps, 1);
    expect(screen.getByText("개념 2/3")).toBeInTheDocument();
  });

  test("원본 단계 3개 중 세 번째(인덱스 2)는 '개념 3/3'을 표시한다", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    renderLearnBar(steps, 2);
    expect(screen.getByText("개념 3/3")).toBeInTheDocument();
  });

  test("분기 단계(1.1)는 독립적인 stepIdx+1 대신 '개념 1.1/3'을 표시한다", () => {
    // [main(1), branch(101, parent=1, sibling=0), main(2)]
    const steps = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    // stepIdx=1 이면 raw 계산은 2이지만 getLabelForStep 은 "1.1" 반환
    renderLearnBar(steps, 1);
    expect(screen.getByText("개념 1.1/3")).toBeInTheDocument();
  });

  test("분기 단계(1.2)는 '개념 1.2/4'를 표시한다", () => {
    // [main(1), branch(101, 1, 0), branch(102, 1, 1), main(2)]
    const steps = [mainStep(1), branchStep(101, 1, 0), branchStep(102, 1, 1), mainStep(2)];
    renderLearnBar(steps, 2);
    expect(screen.getByText("개념 1.2/4")).toBeInTheDocument();
  });

  test("원본 두 번째 단계 뒤에 분기가 삽입되어도 원본 번호가 연속된다 - 2번째 원본은 '개념 2/4'", () => {
    // [main(1), branch(101, 1, 0), main(2), main(3)]
    // stepIdx=2 → getLabelForStep = "2" (raw라면 3)
    const steps = [mainStep(1), branchStep(101, 1, 0), mainStep(2), mainStep(3)];
    renderLearnBar(steps, 2);
    expect(screen.getByText("개념 2/4")).toBeInTheDocument();
  });

  test("learn 단계가 아닌 probe 단계에서는 pb-sub 라벨이 렌더되지 않는다", () => {
    const steps = [mainStep(1), mainStep(2)];
    mockUseLearnContent.mockReturnValue({ steps } as ReturnType<typeof useLearnContent>);
    const { container } = render(<ProgressBar stage="probe" stepIdx={0} />);
    // pb-sub 는 learn 단계(curr)에서만 렌더된다
    expect(container.querySelector(".pb-sub")).toBeNull();
  });

  test("단계가 1개일 때 '개념 1/1'을 표시한다", () => {
    const steps = [mainStep(1)];
    renderLearnBar(steps, 0);
    expect(screen.getByText("개념 1/1")).toBeInTheDocument();
  });
});
