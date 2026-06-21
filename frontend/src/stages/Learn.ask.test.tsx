/**
 * Learn.tsx '질문하기'(1회성 라우팅) 단위 테스트.
 *
 * 라우터 분류 결과(prereq | newStep | none) → 프론트 동작 매핑을 검증한다:
 *  - prereq  → 기존 선행 개념 모달(prereq.onOpen) 재사용
 *  - newStep '바로 이동'    → markBranched + insertStepAt + setStepIdx (게이팅 우회)
 *  - newStep '로드맵에 추가' → insertStepAt 만(이동/markBranched 없음)
 *  - none    → 안내만(액션 버튼·후속 입력 UI 없음 = 멀티턴 채팅 아님)
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
// askLearnQuestion 만 스텁(나머지 실제 export 유지: ClaudeContentError 등).
vi.mock("../api/claudeContent", async (importActual) => {
  const actual = await importActual<typeof import("../api/claudeContent")>();
  return { ...actual, askLearnQuestion: vi.fn() };
});

import { StageLearn } from "./Learn";
import { askLearnQuestion } from "../api/claudeContent";

const mockAsk = vi.mocked(askLearnQuestion);

const sampleSteps: Step[] = [
  { id: 1, title: "동시성 기초", desc: "동시성이란", body: "test body", questions: [] },
  { id: 2, title: "스레드 비용", desc: "스레드란", body: "test body", questions: [] },
];

function makeLearnContent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const branchedStepIds = new Set<number>();
  return {
    steps: sampleSteps,
    outlineStatus: "ready",
    outlineError: null,
    stepDetailStatus: { 0: "ready", 1: "ready" },
    stepDetailErrors: { 0: null, 1: null },
    loadStepDetail: vi.fn(),
    stepEvaluations: {},
    stepEvalStatus: {},
    stepEvalErrors: {},
    submitEvaluation: vi.fn(),
    clearEvaluation: vi.fn(),
    stepBranches: {},
    setStepBranch: vi.fn(),
    branchedStepIds,
    markBranched: vi.fn((id: number) => branchedStepIds.add(id)),
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
    chooseBranch: vi.fn(() => ({ roadmapStages: sampleSteps, currentStageIndex: 0, stage: "explain" })),
    closeBranch: vi.fn(),
    retryBranch: vi.fn(),
    hydrate: vi.fn(),
    ...overrides,
  };
}

const onOpenPrereq = vi.fn();
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
    prereq: { depth: 0, onOpen: onOpenPrereq, onReturnToParent: vi.fn(), onNewIndependent: vi.fn() },
  };
  return render(<StageLearn {...base} {...props} />);
}

// 질문하기 트리거 → 입력 → 제출. 패널 영역(role=region "질문하기")을 반환해
// 헤더의 선행 트리거("선행 개념 보기")와 섞이지 않게 결과 단언을 패널로 한정한다.
function openPanel(question: string): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: /질문하기/ }));
  const panel = screen.getByRole("region", { name: "질문하기" });
  fireEvent.change(within(panel).getByPlaceholderText(/상태/), { target: { value: question } });
  fireEvent.click(within(panel).getByRole("button", { name: /질문 보내기/ }));
  return panel;
}

beforeEach(() => {
  mockLearnContent = makeLearnContent();
  mockBranchPhase = makeBranchPhase();
  mockAsk.mockReset();
  onOpenPrereq.mockReset();
});

describe("prereq 라우트", () => {
  test("'선행 개념 보기' 클릭 시 기존 선행 모달(prereq.onOpen)을 연다", async () => {
    mockAsk.mockResolvedValue({ route: "prereq", message: "먼저 알면 좋아요", suggestedStep: null });
    renderLearn({ stepIdx: 0 });
    const panel = openPanel("이게 뭐죠?");

    fireEvent.click(await within(panel).findByRole("button", { name: /선행 개념 보기/ }));
    expect(onOpenPrereq).toHaveBeenCalledTimes(1);
  });
});

describe("newStep 라우트", () => {
  test("'바로 이동' 시 markBranched + insertStepAt(1, 보충스텝) + setStepIdx(1) (게이팅 우회)", async () => {
    mockAsk.mockResolvedValue({
      route: "newStep",
      message: "따로 짚어볼게요",
      suggestedStep: { title: "이벤트 루프", desc: "한 줄 부제" },
    });
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({ insertStepAt });
    const setStepIdx = vi.fn();
    renderLearn({ stepIdx: 0, setStepIdx });
    const panel = openPanel("이벤트 루프가 궁금해요");

    fireEvent.click(await within(panel).findByRole("button", { name: /바로 이동/ }));

    expect(mockLearnContent.markBranched).toHaveBeenCalledWith(1);
    expect(insertStepAt).toHaveBeenCalledWith(1, {
      id: 0,
      title: "이벤트 루프",
      desc: "한 줄 부제",
      body: "",
      questions: [],
      _meta: { parentMainStepId: 1, siblingIndex: 0 },
    });
    expect(setStepIdx).toHaveBeenCalledWith(1);
  });

  test("'로드맵에 추가' 시 insertStepAt 만 호출(이동·markBranched 없음)", async () => {
    mockAsk.mockResolvedValue({
      route: "newStep",
      message: "따로 짚어볼게요",
      suggestedStep: { title: "이벤트 루프", desc: "한 줄 부제" },
    });
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({ insertStepAt });
    const setStepIdx = vi.fn();
    renderLearn({ stepIdx: 0, setStepIdx });
    const panel = openPanel("이벤트 루프가 궁금해요");

    fireEvent.click(await within(panel).findByRole("button", { name: /로드맵에 추가/ }));

    expect(insertStepAt).toHaveBeenCalledWith(1, expect.objectContaining({ title: "이벤트 루프" }));
    expect(setStepIdx).not.toHaveBeenCalled();
    expect(mockLearnContent.markBranched).not.toHaveBeenCalled();
    // 추가 안내 토스트(패널 밖, lv-board 레벨)
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("none 라우트 (멀티턴 채팅 아님)", () => {
  test("안내 메시지만 보이고 이동/선행 액션 버튼과 후속 입력칸이 없다", async () => {
    mockAsk.mockResolvedValue({
      route: "none",
      message: "이미 본문에서 다루고 있어요",
      suggestedStep: null,
    });
    renderLearn({ stepIdx: 0 });
    const panel = openPanel("질문");

    expect(await within(panel).findByText(/이미 본문에서 다루고 있어요/)).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /바로 이동/ })).toBeNull();
    expect(within(panel).queryByRole("button", { name: /선행 개념 보기/ })).toBeNull();
    // 결과 제시 후 후속 메시지 입력 UI(textarea)가 없어야 한다(단발 1회 = 멀티턴 아님).
    expect(within(panel).queryByRole("textbox")).toBeNull();
  });
});
