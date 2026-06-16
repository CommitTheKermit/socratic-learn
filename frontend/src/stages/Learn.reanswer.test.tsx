/**
 * Learn.tsx 재답변(다시 답변하기) 단위 테스트
 *
 * "마치기 전이면 언제든" 잠긴(평가 완료) 단계를 다시 답변할 수 있어야 한다.
 *  - 잠긴 단계에 "다시 답변하기" 버튼 노출(branch/light 공통)
 *  - 클릭 시 clearEvaluation(stepIdx) + branch.closeBranch 호출(피드백 즉시 제거)
 *  - 분기 다이얼로그 안에도 "다시 답변하기" 옵션이 있고, 선택 시 재답변으로만 동작
 *    (setStepIdx/insertStepAt/onDone 미호출)
 *  - 미제출 단계에는 버튼이 없고 "답변 제출하기"가 보인다
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

const sampleSteps: Step[] = [
  { id: 1, title: "동시성 기초", desc: "동시성이란", body: "test body", questions: [] },
  { id: 2, title: "스레드 비용", desc: "스레드란", body: "test body", questions: [] },
  { id: 3, title: "코루틴 기초", desc: "코루틴이란", body: "test body", questions: [] },
];

function makeLearnContent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    steps: sampleSteps,
    outlineStatus: "ready",
    outlineError: null,
    stepDetailStatus: { 0: "ready", 1: "ready", 2: "ready" },
    stepDetailErrors: { 0: null, 1: null, 2: null },
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

function makeBranchPhase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    mode: "closed",
    evaluationText: "",
    options: [],
    retryCount: 0,
    errorMessage: null,
    technicalDetail: null,
    openBranch: vi.fn(),
    chooseBranch: vi.fn(() => ({
      roadmapStages: sampleSteps,
      currentStageIndex: 0,
      stage: "explain",
    })),
    closeBranch: vi.fn(),
    retryBranch: vi.fn(),
    hydrate: vi.fn(),
    ...overrides,
  };
}

function renderLearn(props: Partial<Parameters<typeof StageLearn>[0]> = {}) {
  const base = {
    concept: "코루틴",
    level: 2,
    mode: "branch",
    sessionId: "s1",
    stepIdx: 0,
    setStepIdx: vi.fn(),
    answers: {},
    setAnswers: vi.fn(),
    skips: {},
    setSkips: vi.fn(),
    onPrev: vi.fn(),
    onDone: vi.fn(),
    onRetry: vi.fn(),
  };
  return render(<StageLearn {...base} {...props} />);
}

beforeEach(() => {
  mockLearnContent = makeLearnContent();
  mockBranchPhase = makeBranchPhase();
});

describe("재답변 버튼 노출", () => {
  test("branch mode 평가 완료 단계에 '다시 답변하기' 버튼이 보인다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing", evaluationText: "평가 완료" });

    renderLearn({ mode: "branch", stepIdx: 0 });

    expect(screen.getByRole("button", { name: /다시 답변하기/ })).toBeInTheDocument();
  });

  test("light mode 평가 완료 단계에도 '다시 답변하기' 버튼이 보인다(평가 보기는 없음)", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "closed" });

    renderLearn({ mode: "light", stepIdx: 0 });

    expect(screen.getByRole("button", { name: /다시 답변하기/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /평가 보기/ })).not.toBeInTheDocument();
  });

  test("미제출(미평가) 단계에는 '다시 답변하기'가 없고 '답변 제출하기'가 보인다", () => {
    mockLearnContent = makeLearnContent(); // 평가 없음
    mockBranchPhase = makeBranchPhase({ mode: "closed" });

    renderLearn({ mode: "branch", stepIdx: 0 });

    expect(screen.queryByRole("button", { name: /다시 답변하기/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /답변 제출하기/ })).toBeInTheDocument();
  });
});

describe("재답변 동작", () => {
  test("'다시 답변하기' 클릭 시 clearEvaluation(stepIdx) 과 closeBranch 가 호출된다", () => {
    const clearEvaluation = vi.fn();
    const closeBranch = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 1: "ready" },
      stepEvaluations: { 1: { evaluations: [] } },
      clearEvaluation,
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing", evaluationText: "평가 완료", closeBranch });

    renderLearn({ mode: "branch", stepIdx: 1 });

    fireEvent.click(screen.getByRole("button", { name: /다시 답변하기/ }));

    expect(clearEvaluation).toHaveBeenCalledWith(1);
    expect(closeBranch).toHaveBeenCalled();
  });
});

describe("분기 다이얼로그 내 재답변 옵션", () => {
  test("다이얼로그에 '다시 답변하기' 옵션이 있고, 선택 시 재답변만 일어난다", () => {
    const clearEvaluation = vi.fn();
    const setStepIdx = vi.fn();
    const insertStepAt = vi.fn(() => 99);
    const onDone = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      clearEvaluation,
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing", evaluationText: "평가 완료", options: [] });

    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx, onDone });

    // 평가 보기 클릭 - 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    // 다이얼로그 내부의 '다시 답변하기' 옵션 클릭(스티키 버튼과 구분)
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /다시 답변하기/ }));

    expect(clearEvaluation).toHaveBeenCalledWith(0);
    expect(setStepIdx).not.toHaveBeenCalled();
    expect(insertStepAt).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
