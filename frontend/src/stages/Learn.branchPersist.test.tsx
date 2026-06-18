/**
 * Learn.tsx 분기 스냅샷 영속화 연동 단위 테스트
 *
 * 분기 평가 결과(stepBranches)가 영속/복원되면, 새로고침·단계 이동으로 분기 다이얼로그가
 * 휘발돼도 "평가 보기"로 복귀할 수 있어야 한다(게이트 데드락 방지).
 *  - choosing 성공 시 setStepBranch 로 스냅샷을 저장한다.
 *  - 진입 시 영속 스냅샷이 있으면 hydrate 로 choosing 을 복원한다.
 *  - 스냅샷이 없는 게이트 상태에서도 "평가 보기"가 노출되고, 클릭 시 openBranch 로 복구한다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    isMerged: false,
    retryCount: 0,
    errorMessage: null,
    technicalDetail: null,
    openBranch: vi.fn(),
    chooseBranch: vi.fn(() => ({ stage: "explain" })),
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
    mode: "branch" as const,
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
    prereq: { depth: 0, onOpen: vi.fn(), onReturnToParent: vi.fn(), onNewIndependent: vi.fn() },
  };
  return render(<StageLearn {...base} {...props} />);
}

const sampleBranch = {
  evaluationText: "평가 완료",
  isMerged: false,
  options: [
    { label: "다음 로드맵", type: "roadmap_next", isRecommended: true, stageContent: null },
  ],
};

beforeEach(() => {
  mockLearnContent = makeLearnContent();
  mockBranchPhase = makeBranchPhase();
});

describe("분기 스냅샷 영속화 - 저장(choosing → setStepBranch)", () => {
  test("분기 평가가 choosing 이고 아직 저장 전이면 setStepBranch(stepIdx, 스냅샷) 가 호출된다", () => {
    const setStepBranch = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      setStepBranch,
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing", ...sampleBranch });

    renderLearn({ stepIdx: 0 });

    expect(setStepBranch).toHaveBeenCalledWith(0, {
      evaluationText: "평가 완료",
      isMerged: false,
      options: sampleBranch.options,
    });
  });

  test("이미 같은 스냅샷이 저장돼 있으면(참조 동일) 중복 저장하지 않는다", () => {
    const setStepBranch = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      stepBranches: { 0: sampleBranch },
      setStepBranch,
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing", ...sampleBranch });

    renderLearn({ stepIdx: 0 });

    expect(setStepBranch).not.toHaveBeenCalled();
  });
});

describe("분기 스냅샷 영속화 - 복원(진입 시 hydrate)", () => {
  test("진입한 단계에 영속 스냅샷이 있으면 hydrate(스냅샷) 로 복원한다", () => {
    const hydrate = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      stepBranches: { 0: sampleBranch },
    });
    mockBranchPhase = makeBranchPhase({ mode: "closed", hydrate });

    renderLearn({ stepIdx: 0 });

    expect(hydrate).toHaveBeenCalledWith(sampleBranch);
  });

  test("영속 스냅샷이 없으면 closeBranch 로 닫는다(기존 동작 유지)", () => {
    const hydrate = vi.fn();
    const closeBranch = vi.fn();
    mockBranchPhase = makeBranchPhase({ mode: "closed", hydrate, closeBranch });

    renderLearn({ stepIdx: 0 });

    expect(hydrate).not.toHaveBeenCalled();
    expect(closeBranch).toHaveBeenCalled();
  });
});

describe("분기 스냅샷 영속화 - 복구(평가 보기 노출/재요청)", () => {
  test("게이트 상태인데 분기 스냅샷이 휘발(closed)돼도 '평가 보기' 가 노출된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    // 평가는 끝났지만 분기 다이얼로그는 닫힘(branchReady=false) - 데드락 재현 상황
    mockBranchPhase = makeBranchPhase({ mode: "closed" });

    renderLearn({ stepIdx: 0 });

    expect(screen.getByRole("button", { name: /평가 보기/ })).toBeInTheDocument();
  });

  test("스냅샷 없는 '평가 보기' 클릭 시 openBranch 로 분기 평가를 재요청한다", () => {
    const openBranch = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "closed", openBranch });

    renderLearn({ stepIdx: 0 });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    expect(openBranch).toHaveBeenCalledTimes(1);
  });

  test("분기 스냅샷이 살아있으면(choosing) '평가 보기' 클릭은 재요청 없이 다이얼로그만 연다", () => {
    const openBranch = vi.fn();
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing", ...sampleBranch, openBranch });

    renderLearn({ stepIdx: 0 });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    expect(openBranch).not.toHaveBeenCalled();
  });
});
