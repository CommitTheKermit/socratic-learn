/**
 * Learn.tsx 분기 게이트 단위 테스트 (AC1~AC5)
 *
 * 분기 모드(mode !== "light")에서 미분기 단계의 전진을 차단하고,
 * 분기 완료 후에는 다시 허용하는 동작을 결정론적으로 검증한다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Step } from "./data";

// vi.mock 은 파일 상단으로 호이스팅됨.
// 클로저로 mockLearnContent / mockBranchPhase 를 참조해 테스트마다 교체한다.
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

// vi.mock 호이스팅 이후에 import 해야 함
import { StageLearn } from "./Learn";

// ─── 테스트 픽스처 ──────────────────────────────────────────────────────────
const sampleSteps: Step[] = [
  { id: 1, title: "동시성 기초", desc: "동시성이란", body: "test body", questions: [] },
  { id: 2, title: "스레드 비용", desc: "스레드란", body: "test body", questions: [] },
  { id: 3, title: "코루틴 기초", desc: "코루틴이란", body: "test body", questions: [] },
];

function makeLearnContent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  // 실제 LearnContent 처럼 markBranched 가 같은 Set 을 in-place 갱신하도록 묶는다.
  // (분기 선택 후 게이트 해제를 검증하는 칩 이동 테스트가 이 갱신에 의존한다.)
  const branchedStepIds = new Set<number>();
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
    branchedStepIds,
    markBranched: vi.fn((id: number) => {
      branchedStepIds.add(id);
    }),
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
    prereq: { depth: 0, onOpen: vi.fn(), onReturnToParent: vi.fn(), onNewIndependent: vi.fn() },
  };
  return render(<StageLearn {...base} {...props} />);
}

beforeEach(() => {
  mockLearnContent = makeLearnContent();
  mockBranchPhase = makeBranchPhase();
});

// ─── AC1: branch mode 미분기 단계에서 다음 개념 버튼 비활성 ─────────────────
describe("AC1: branch mode 미분기 단계 - 다음 개념 버튼 비활성", () => {
  test("평가 완료 후 미분기이면 다음 개념 버튼에 aria-disabled=true 가 부여된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    renderLearn({ mode: "branch", stepIdx: 0 });

    const btn = screen.getByRole("button", { name: /다음 개념/ });
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  test("다음 개념 버튼 클릭 시 setStepIdx 가 호출되지 않고 토스트가 표시된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    fireEvent.click(screen.getByRole("button", { name: /다음 개념/ }));

    expect(setStepIdx).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

// ─── AC2: handleChoose(roadmap_next) - setStepIdx(stepIdx+1) 만 호출 ────────
describe("AC2: handleChoose(roadmap_next) - setStepIdx(stepIdx+1) 만 호출", () => {
  test("roadmap_next 선택 시 setStepIdx(1) 만 호출되고 insertStepAt/onDone 은 호출되지 않는다", () => {
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      options: [],
      evaluationText: "평가 완료",
    });

    const setStepIdx = vi.fn();
    const onDone = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx, onDone });

    // "평가 보기" 버튼 클릭 - 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    // normalizeBranchOptions 가 생성한 "로드맵 다음 단계로 이동" 선택
    fireEvent.click(screen.getByRole("button", { name: /로드맵 다음 단계로 이동/ }));

    expect(setStepIdx).toHaveBeenCalledWith(1);
    expect(insertStepAt).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});

// ─── AC3: light mode - 게이트 없음, 기존 동작 불변 ─────────────────────────
describe("AC3: light mode 동작 불변 - 분기 게이트 없음", () => {
  test("light mode 에서는 평가 완료 후 다음 개념 버튼에 aria-disabled 가 없다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "closed" });

    renderLearn({ mode: "light", stepIdx: 0 });

    const btn = screen.getByRole("button", { name: /다음 개념/ });
    expect(btn).not.toHaveAttribute("aria-disabled");
  });

  test("light mode 에서는 다음 개념 클릭 시 setStepIdx(1) 이 호출된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "closed" });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "light", stepIdx: 0, setStepIdx });

    fireEvent.click(screen.getByRole("button", { name: /다음 개념/ }));

    expect(setStepIdx).toHaveBeenCalledWith(1);
  });
});

// ─── AC4: 분기 완료 후 다음 개념 버튼 활성 ───────────────────────────────────
describe("AC4: 분기 완료 후 다음 개념 버튼 활성화", () => {
  test("roadmap_next 선택 시 markBranched(step.id) 로 위임하고, 갱신 후 다음 개념 버튼의 aria-disabled 가 제거된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      options: [],
      evaluationText: "평가 완료",
    });

    // 게이트 해제는 LearnContent 의 branchedStepIds(Set) 갱신 → 재렌더로 일어난다.
    // 단위 테스트에서는 mock 의 markBranched 가 같은 Set 을 in-place 갱신하고, rerender 로 모사한다.
    const props = {
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
    const { rerender } = render(<StageLearn {...props} />);

    // 초기 상태: aria-disabled 있음
    expect(screen.getByRole("button", { name: /다음 개념/ })).toHaveAttribute("aria-disabled", "true");

    // 평가 보기 클릭 - 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    // roadmap_next 선택 - 분기 완료를 LearnContent 에 위임(markBranched(1))
    fireEvent.click(screen.getByRole("button", { name: /로드맵 다음 단계로 이동/ }));
    expect(mockLearnContent.markBranched).toHaveBeenCalledWith(1);

    // LearnContent 갱신(여기선 in-place + rerender) 후: aria-disabled 제거됨
    rerender(<StageLearn {...props} />);
    expect(screen.getByRole("button", { name: /다음 개념/ })).not.toHaveAttribute("aria-disabled");
  });
});

// ─── Sub-AC 2b: handleChoose(stageContent) - insertStepAt 먼저, setStepIdx 이후 ──
describe("Sub-AC 2b: handleChoose(stageContent) - insertStepAt 먼저 호출 후 setStepIdx", () => {
  test("stageContent 분기 선택 시 insertStepAt(stepIdx+1, stageContent) 가 먼저 호출되고 setStepIdx(stepIdx+1) 가 이후 호출된다", () => {
    const callOrder: string[] = [];
    const insertStepAt = vi.fn((_idx: number) => {
      callOrder.push("insertStepAt");
      return 99;
    });
    const setStepIdx = vi.fn((_n: number) => {
      callOrder.push("setStepIdx");
    });

    const branchStageContent: Step = {
      id: 10,
      title: "추천 단계",
      desc: "AI 추천 단계",
      body: "body",
      questions: [],
    };

    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      options: [
        {
          label: "AI 추천 단계로 이동",
          type: "ai_recommended",
          isRecommended: true,
          stageContent: branchStageContent,
        },
      ],
    });

    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    // "평가 보기" 클릭 - 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    // "AI 추천 단계로 이동" 클릭
    fireEvent.click(screen.getByRole("button", { name: /AI 추천 단계로 이동/ }));

    // insertStepAt 이 (1, branchStageContent + _meta) 로 호출되었는지 확인
    // _meta: 현재 stepIdx=0 의 step.id=1 을 부모로, 형제 0번(첫 분기)
    expect(insertStepAt).toHaveBeenCalledWith(1, {
      ...branchStageContent,
      _meta: { parentMainStepId: 1, siblingIndex: 0 },
    });
    // setStepIdx 가 (1) 로 호출되었는지 확인
    expect(setStepIdx).toHaveBeenCalledWith(1);
    // 호출 순서: insertStepAt 먼저, setStepIdx 이후
    expect(callOrder).toEqual(["insertStepAt", "setStepIdx"]);
  });
});

// ─── Sub-AC 2c: handleChoose(exit) - onDone() 만 호출, setStepIdx/insertStepAt 호출 안 됨 ──
describe("Sub-AC 2c: handleChoose(exit) - onDone() 호출, setStepIdx/insertStepAt 미호출", () => {
  test("exit 타입 선택 시 onDone 이 호출된다", () => {
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      options: [
        {
          label: "학습 마치기",
          type: "exit",
          isRecommended: false,
          stageContent: null,
        },
      ],
    });

    const setStepIdx = vi.fn();
    const onDone = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx, onDone });

    // "평가 보기" 클릭 - 다이얼로그 오픈
    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    // "학습 마치기" (exit 타입) 클릭
    fireEvent.click(screen.getByRole("button", { name: /학습 마치기/ }));

    expect(onDone).toHaveBeenCalled();
  });

  test("exit 타입 선택 시 setStepIdx 는 호출되지 않는다", () => {
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      options: [
        {
          label: "학습 마치기",
          type: "exit",
          isRecommended: false,
          stageContent: null,
        },
      ],
    });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /학습 마치기/ }));

    expect(setStepIdx).not.toHaveBeenCalled();
  });

  test("exit 타입 선택 시 insertStepAt 은 호출되지 않는다", () => {
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      options: [
        {
          label: "학습 마치기",
          type: "exit",
          isRecommended: false,
          stageContent: null,
        },
      ],
    });

    renderLearn({ mode: "branch", stepIdx: 0 });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /학습 마치기/ }));

    expect(insertStepAt).not.toHaveBeenCalled();
  });
});

// ─── AC5: 마지막 단계 학습 마치기는 분기 모드에서도 비차단 ─────────────────
describe("AC5: 마지막 단계 학습 마치기 비차단", () => {
  test("branch mode 마지막 단계에서 학습 마치기 버튼에 aria-disabled 가 없다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 2: "ready" },
      stepEvaluations: { 2: { evaluations: [] } },
      stepDetailStatus: { 2: "ready" },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    renderLearn({ mode: "branch", stepIdx: 2 });

    const btn = screen.getByRole("button", { name: /학습 마치기/ });
    expect(btn).not.toHaveAttribute("aria-disabled");
  });

  test("branch mode 마지막 단계에서 학습 마치기 클릭 시 onDone 이 호출된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 2: "ready" },
      stepEvaluations: { 2: { evaluations: [] } },
      stepDetailStatus: { 2: "ready" },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    const onDone = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 2, onDone });

    fireEvent.click(screen.getByRole("button", { name: /학습 마치기/ }));

    expect(onDone).toHaveBeenCalled();
  });
});

// ─── AC4(칩): 분기 모드 단계 칩 전진 차단 / 복습·분기완료 칩 허용 ─────────────
describe("AC4(칩): 분기 모드 단계 칩 전진 게이팅", () => {
  test("미분기 현재 단계에서 아직 도달 안 한 뒤 단계 칩 클릭 시 setStepIdx 미호출 + 토스트", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    // 뒤 단계(index 1, "스레드 비용") 칩 클릭 - 현재 단계 미분기라 차단되어야 함
    fireEvent.click(screen.getByRole("button", { name: /스레드 비용/ }));

    expect(setStepIdx).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("미분기 현재 단계에서 뒤 단계 칩에 aria-disabled=true 가 부여된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    renderLearn({ mode: "branch", stepIdx: 0 });

    expect(screen.getByRole("button", { name: /스레드 비용/ })).toHaveAttribute("aria-disabled", "true");
  });

  test("현재 이하(복습) 단계 칩 클릭 시 setStepIdx(i) 가 정상 호출된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 1: "ready" },
      stepEvaluations: { 1: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "choosing" });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 1, setStepIdx });

    // 앞 단계(index 0, "동시성 기초") 칩 클릭 - i <= stepIdx 라 허용
    fireEvent.click(screen.getByRole("button", { name: /동시성 기초/ }));

    expect(setStepIdx).toHaveBeenCalledWith(0);
  });

  test("이미 분기를 끝낸 현재 단계에서는 뒤 단계 칩 이동이 허용된다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      options: [],
      evaluationText: "평가 완료",
    });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    // 분기 선택으로 현재 단계(id=1)를 분기 완료 처리
    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /로드맵 다음 단계로 이동/ }));
    setStepIdx.mockClear();

    // 분기 완료 후 뒤 단계 칩 클릭 - 허용되어야 함
    fireEvent.click(screen.getByRole("button", { name: /코루틴 기초/ }));

    expect(setStepIdx).toHaveBeenCalledWith(2);
  });

  test("light 모드에서는 뒤 단계 칩 이동이 자유롭다", () => {
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
    });
    mockBranchPhase = makeBranchPhase({ mode: "closed" });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "light", stepIdx: 0, setStepIdx });

    fireEvent.click(screen.getByRole("button", { name: /스레드 비용/ }));

    expect(setStepIdx).toHaveBeenCalledWith(1);
  });
});

// ─── AC2(isMerged): isMerged=true 시 ai_recommended 옵션 자체를 미표시 ──────────
describe("AC2(isMerged): isMerged=true 시 ai_recommended 다이얼로그 미표시", () => {
  const branchStageContent: Step = {
    id: 10,
    title: "AI 추천 보조 단계",
    desc: "AI 추천",
    body: "body",
    questions: [],
  };

  test("isMerged=true + ai_recommended 는 다이얼로그에 옵션으로 렌더링되지 않는다", () => {
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      isMerged: true,
      options: [
        {
          label: "AI 추천 단계로 이동",
          type: "ai_recommended",
          isRecommended: true,
          stageContent: branchStageContent,
        },
      ],
    });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));

    // isMerged=true 인 ai_recommended 는 눌러도 삽입이 차단돼 조용히 다음 단계로
    // 튕기던 옵션이므로 애초에 다이얼로그에 띄우지 않는다(추천 옵션 부재).
    expect(screen.queryByRole("button", { name: /AI 추천 단계로 이동/ })).toBeNull();
    // 다이얼로그 자체는 정상 렌더(로드맵 다음 단계 옵션은 존재)
    expect(screen.getByRole("button", { name: /로드맵 다음 단계로 이동/ })).toBeTruthy();
    expect(insertStepAt).not.toHaveBeenCalled();
  });

  test("isMerged=false 이면 ai_recommended 단계를 정상 삽입한다", () => {
    const insertStepAt = vi.fn(() => 99);
    const newStep: Step = {
      id: 20,
      title: "완전히 새로운 보조 개념",
      desc: "새 개념",
      body: "body",
      questions: [],
    };
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      isMerged: false,
      options: [
        {
          label: "새 AI 추천 단계",
          type: "ai_recommended",
          isRecommended: true,
          stageContent: newStep,
        },
      ],
    });

    const setStepIdx = vi.fn();
    renderLearn({ mode: "branch", stepIdx: 0, setStepIdx });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /새 AI 추천 단계/ }));

    expect(insertStepAt).toHaveBeenCalled();
    expect(setStepIdx).toHaveBeenCalledWith(1);
  });

  test("isMerged=true 이어도 additional 타입은 삽입된다 (isMerged 는 ai_recommended 에만 적용)", () => {
    const insertStepAt = vi.fn(() => 99);
    const additionalStep: Step = {
      id: 30,
      title: "사용자 추가 보충 단계",
      desc: "추가",
      body: "body",
      questions: [],
    };
    mockLearnContent = makeLearnContent({
      stepEvalStatus: { 0: "ready" },
      stepEvaluations: { 0: { evaluations: [] } },
      insertStepAt,
    });
    mockBranchPhase = makeBranchPhase({
      mode: "choosing",
      evaluationText: "평가 완료",
      isMerged: true,
      options: [
        {
          label: "추가 학습 단계",
          type: "additional",
          isRecommended: false,
          stageContent: additionalStep,
        },
      ],
    });

    renderLearn({ mode: "branch", stepIdx: 0 });

    fireEvent.click(screen.getByRole("button", { name: /평가 보기/ }));
    fireEvent.click(screen.getByRole("button", { name: /추가 학습 단계/ }));

    expect(insertStepAt).toHaveBeenCalled();
  });
});
