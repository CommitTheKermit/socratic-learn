/**
 * Learn.tsx '질문하기'(답변 + 안내, 모달) 단위 테스트.
 *
 * 한 줄 질문 → 산문 답변 + 흐름 안내(prereq | newStep | none) + 후속(최대 2회) + 범위 밖 거절(offtopic).
 *  - prereq  → 답변 + '선행 개념 보기'(prereq.onOpen) 재사용
 *  - newStep '바로 이동'    → markBranched + insertStepAt + setStepIdx (게이팅 우회)
 *  - newStep '로드맵에 추가' → insertStepAt 만(이동/markBranched 없음)
 *  - none    → 답변 + 후속 입력(라우팅 액션 없음)
 *  - offtopic→ 답변 없이 복귀 안내만(후속 입력 없음)
 *  - 후속    → priorTurns 전달, 총 3턴(후속 2회)에서 입력칸이 사라짐
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { Step } from "./data";
import type { AskRouteResponse } from "../api/contract";

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

const ans = (over: Partial<AskRouteResponse>): AskRouteResponse => ({
  route: "none",
  answer: "",
  message: "",
  suggestedStep: null,
  ...over,
});

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

// 질문하기 트리거 → 모달 → 첫 질문 입력 → 제출. 결과 단언은 모달(role=dialog)로 한정한다.
function openModal(question: string): HTMLElement {
  fireEvent.click(screen.getByRole("button", { name: "질문하기" }));
  const dialog = screen.getByRole("dialog", { name: "질문하기" });
  fireEvent.change(within(dialog).getByPlaceholderText(/상태/), { target: { value: question } });
  fireEvent.click(within(dialog).getByRole("button", { name: /질문 보내기/ }));
  return dialog;
}

beforeEach(() => {
  mockLearnContent = makeLearnContent();
  mockBranchPhase = makeBranchPhase();
  mockAsk.mockReset();
  onOpenPrereq.mockReset();
});

describe("prereq 라우트", () => {
  test("산문 답변과 함께 '선행 개념 보기' 클릭 시 기존 선행 모달(prereq.onOpen)을 연다", async () => {
    mockAsk.mockResolvedValue(
      ans({ route: "prereq", answer: "이건 콜스택 얘기예요", message: "먼저 알면 좋아요" }),
    );
    renderLearn({ stepIdx: 0 });
    const dialog = openModal("이게 뭐죠?");

    expect(await within(dialog).findByText(/콜스택 얘기예요/)).toBeInTheDocument();
    fireEvent.click(await within(dialog).findByRole("button", { name: /선행 개념 보기/ }));
    expect(onOpenPrereq).toHaveBeenCalledTimes(1);
  });
});

describe("newStep 라우트", () => {
  test("'바로 이동' 시 markBranched + insertStepAt(1, 보충스텝) + setStepIdx(1) (게이팅 우회)", async () => {
    mockAsk.mockResolvedValue(
      ans({
        route: "newStep",
        answer: "이건 이벤트 루프와 닿아 있어요",
        message: "따로 짚어볼게요",
        suggestedStep: { title: "이벤트 루프", desc: "한 줄 부제" },
      }),
    );
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({ insertStepAt });
    const setStepIdx = vi.fn();
    renderLearn({ stepIdx: 0, setStepIdx });
    const dialog = openModal("이벤트 루프가 궁금해요");

    fireEvent.click(await within(dialog).findByRole("button", { name: /바로 이동/ }));

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
    mockAsk.mockResolvedValue(
      ans({
        route: "newStep",
        answer: "이건 이벤트 루프와 닿아 있어요",
        message: "따로 짚어볼게요",
        suggestedStep: { title: "이벤트 루프", desc: "한 줄 부제" },
      }),
    );
    const insertStepAt = vi.fn(() => 99);
    mockLearnContent = makeLearnContent({ insertStepAt });
    const setStepIdx = vi.fn();
    renderLearn({ stepIdx: 0, setStepIdx });
    const dialog = openModal("이벤트 루프가 궁금해요");

    fireEvent.click(await within(dialog).findByRole("button", { name: /로드맵에 추가/ }));

    expect(insertStepAt).toHaveBeenCalledWith(1, expect.objectContaining({ title: "이벤트 루프" }));
    expect(setStepIdx).not.toHaveBeenCalled();
    expect(mockLearnContent.markBranched).not.toHaveBeenCalled();
    // 추가 안내 토스트(모달 밖, lv-board 레벨)
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("none 라우트 (답변 + 후속)", () => {
  test("산문 답변이 보이고 라우팅 액션 버튼은 없으며 후속 입력칸이 있다", async () => {
    mockAsk.mockResolvedValue(
      ans({ route: "none", answer: "지금 단계 안에서 충분히 다뤄요", message: "이어서 봐요" }),
    );
    renderLearn({ stepIdx: 0 });
    const dialog = openModal("질문");

    expect(await within(dialog).findByText(/충분히 다뤄요/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /바로 이동/ })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /선행 개념 보기/ })).toBeNull();
    // 후속 입력칸은 있어야 한다(최대 2회 멀티턴).
    expect(within(dialog).getByPlaceholderText(/이어서/)).toBeInTheDocument();
  });
});

describe("offtopic 라우트 (범위 밖 거절)", () => {
  test("복귀 안내만 보이고 답변·후속 입력칸이 없다", async () => {
    mockAsk.mockResolvedValue(
      ans({ route: "offtopic", answer: "", message: "이 질문은 지금 학습 범위 밖이에요" }),
    );
    renderLearn({ stepIdx: 0 });
    const dialog = openModal("점심 뭐 먹지");

    expect(await within(dialog).findByText(/학습 범위 밖이에요/)).toBeInTheDocument();
    // 범위 밖이면 후속 입력 없음.
    expect(within(dialog).queryByPlaceholderText(/이어서/)).toBeNull();
  });
});

describe("후속 질문 (최대 2회)", () => {
  test("후속은 priorTurns 를 전달하고, 총 3턴이 되면 입력칸이 사라진다", async () => {
    mockAsk
      .mockResolvedValueOnce(ans({ route: "none", answer: "첫 답변이에요" }))
      .mockResolvedValueOnce(ans({ route: "none", answer: "둘째 답변이에요" }))
      .mockResolvedValueOnce(ans({ route: "none", answer: "셋째 답변이에요" }));
    renderLearn({ stepIdx: 0 });
    const dialog = openModal("첫 질문");
    expect(await within(dialog).findByText(/첫 답변이에요/)).toBeInTheDocument();

    // 후속 1
    fireEvent.change(within(dialog).getByPlaceholderText(/이어서/), { target: { value: "후속 하나" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /이어 묻기/ }));
    expect(await within(dialog).findByText(/둘째 답변이에요/)).toBeInTheDocument();
    expect(mockAsk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ priorTurns: [{ question: "첫 질문", answer: "첫 답변이에요" }] }),
    );

    // 후속 2 (마지막 허용 턴)
    fireEvent.change(within(dialog).getByPlaceholderText(/이어서/), { target: { value: "후속 둘" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /이어 묻기/ }));
    expect(await within(dialog).findByText(/셋째 답변이에요/)).toBeInTheDocument();

    // 총 3턴 → 후속 입력칸 사라짐.
    expect(within(dialog).queryByPlaceholderText(/이어서/)).toBeNull();
  });
});
