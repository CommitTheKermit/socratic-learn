/**
 * Sub-AC 4: Learn 헤더 단계목록(step list) 라벨 렌더링 검증
 *
 * Learn.tsx 의 <ol className="lv-steps"> 가 getLabelForStep 을 import 해
 * 목록 항목 라벨을 표시하고, 내부 독립 번호 생성 로직이 없음을 검증한다.
 * (vitest + @testing-library/react 로 렌더링된 .lv-step-num 텍스트 확인)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { Step } from "./data";

// eslint-disable-next-line prefer-const
let mockLearnContent: Record<string, unknown>;
// eslint-disable-next-line prefer-const
let mockBranchPhase: Record<string, unknown>;

vi.mock("../state/LearnContent", () => ({
  useLearnContent: () => mockLearnContent,
}));
vi.mock("../state/useBranchPhase", () => ({
  useBranchPhase: () => mockBranchPhase,
}));

import { StageLearn } from "./Learn";

// ─── 픽스처 ────────────────────────────────────────────────────────────────

function mainStep(id: number, title: string): Step {
  return { id, title, desc: "", body: "본문", questions: [] };
}

function branchStep(
  id: number,
  title: string,
  parentMainStepId: number,
  siblingIndex: number,
): Step {
  return {
    id,
    title,
    desc: "",
    body: "본문",
    questions: [],
    _meta: { parentMainStepId, siblingIndex },
  };
}

function makeLearnContent(steps: Step[], overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const statusMap: Record<number, string> = {};
  const errMap: Record<number, null> = {};
  steps.forEach((_, i) => {
    statusMap[i] = "ready";
    errMap[i] = null;
  });
  return {
    steps,
    outlineStatus: "ready",
    outlineError: null,
    stepDetailStatus: statusMap,
    stepDetailErrors: errMap,
    loadStepDetail: vi.fn(),
    stepEvaluations: {},
    stepEvalStatus: {},
    stepEvalErrors: {},
    submitEvaluation: vi.fn(),
    clearEvaluation: vi.fn(),
    stepBranches: {},
    setStepBranch: vi.fn(),
    branchedStepIds: new Set<number>(),
    markBranched: vi.fn(),
    insertStepAt: vi.fn(() => 99),
    ...overrides,
  };
}

function makeBranchPhase(): Record<string, unknown> {
  return {
    mode: "closed",
    evaluationText: "",
    options: [],
    retryCount: 0,
    errorMessage: null,
    technicalDetail: null,
    openBranch: vi.fn(),
    chooseBranch: vi.fn(() => ({ stage: "explain" })),
    closeBranch: vi.fn(),
    retryBranch: vi.fn(),
    hydrate: vi.fn(),
  };
}

function renderLearn(steps: Step[], stepIdx = 0) {
  return render(
    <StageLearn
      concept="코루틴"
      level={2}
      mode="branch"
      sessionId="s-test"
      stepIdx={stepIdx}
      setStepIdx={vi.fn()}
      answers={{}}
      setAnswers={vi.fn()}
      skips={{}}
      setSkips={vi.fn()}
      onPrev={vi.fn()}
      onDone={vi.fn()}
      onRetry={vi.fn()}
      prereq={{ depth: 0, onOpen: vi.fn(), onReturnToParent: vi.fn(), onNewIndependent: vi.fn() }}
    />,
  );
}

beforeEach(() => {
  mockBranchPhase = makeBranchPhase();
});

// ─── 원본(메인) 단계 라벨 ──────────────────────────────────────────────────

describe("Sub-AC 4: Learn 헤더 단계목록 - 원본 단계 정수 라벨", () => {
  test("원본 단계 3개를 렌더하면 .lv-step-num 이 1, 2, 3을 표시한다", () => {
    const steps = [
      mainStep(10, "동시성 기초"),
      mainStep(20, "스레드 비용"),
      mainStep(30, "코루틴 개요"),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums).toHaveLength(3);
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("2");
    expect(nums[2].textContent).toBe("3");
  });

  test("원본 단계 라벨에 zero-pad(01, 02)가 없다", () => {
    const steps = [mainStep(1, "A"), mainStep(2, "B")];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums[0].textContent).not.toBe("01");
    expect(nums[1].textContent).not.toBe("02");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("2");
  });
});

// ─── 삽입(분기) 단계 계층형 십진수 라벨 ────────────────────────────────────

describe("Sub-AC 4: Learn 헤더 단계목록 - 분기 단계 계층형 십진수 라벨", () => {
  test("원본 1 뒤에 분기 단계가 오면 1, 1.1을 표시한다", () => {
    const steps = [
      mainStep(1, "메인1"),
      branchStep(101, "보강1-1", 1, 0),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
  });

  test("원본 1 아래 분기 두 개: 1, 1.1, 1.2를 표시한다", () => {
    const steps = [
      mainStep(1, "메인1"),
      branchStep(101, "보강1-1", 1, 0),
      branchStep(102, "보강1-2", 1, 1),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
    expect(nums[2].textContent).toBe("1.2");
  });

  test("원본 2개 각 뒤에 분기: 1, 1.1, 2, 2.1을 표시한다", () => {
    const steps = [
      mainStep(10, "메인1"),
      branchStep(101, "보강1-1", 10, 0),
      mainStep(20, "메인2"),
      branchStep(201, "보강2-1", 20, 0),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
    expect(nums[2].textContent).toBe("2");
    expect(nums[3].textContent).toBe("2.1");
  });
});

// ─── 혼합 배열: 원본 순번이 건너뛰지 않는다 ─────────────────────────────────

describe("Sub-AC 4: Learn 헤더 단계목록 - 혼합 배열 순번 일관성", () => {
  test("원본-분기-원본-원본 순서: 1, 1.1, 2, 3을 표시한다", () => {
    const steps = [
      mainStep(1, "메인1"),
      branchStep(100, "보강", 1, 0),
      mainStep(2, "메인2"),
      mainStep(3, "메인3"),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
    expect(nums[2].textContent).toBe("2");
    expect(nums[3].textContent).toBe("3");
  });

  test("다수 분기와 원본 혼합: 1, 1.1, 1.2, 2, 2.1, 3을 표시한다", () => {
    const steps = [
      mainStep(10, "메인1"),
      branchStep(101, "보강1-1", 10, 0),
      branchStep(102, "보강1-2", 10, 1),
      mainStep(20, "메인2"),
      branchStep(201, "보강2-1", 20, 0),
      mainStep(30, "메인3"),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    const nums = container.querySelectorAll(".lv-bar .lv-step-num");
    expect(nums[0].textContent).toBe("1");
    expect(nums[1].textContent).toBe("1.1");
    expect(nums[2].textContent).toBe("1.2");
    expect(nums[3].textContent).toBe("2");
    expect(nums[4].textContent).toBe("2.1");
    expect(nums[5].textContent).toBe("3");
  });

  test("steps 개수와 .lv-step-num 개수가 일치한다 (내부 독립 번호 로직이 없다)", () => {
    const steps = [
      mainStep(1, "A"),
      branchStep(100, "A-1", 1, 0),
      mainStep(2, "B"),
    ];
    mockLearnContent = makeLearnContent(steps);

    const { container } = renderLearn(steps);

    // 3개 단계 → .lv-step-num 3개 (내부 독립 카운터가 없어야 항상 steps.length 와 일치)
    expect(container.querySelectorAll(".lv-bar .lv-step-num")).toHaveLength(steps.length);
  });
});
