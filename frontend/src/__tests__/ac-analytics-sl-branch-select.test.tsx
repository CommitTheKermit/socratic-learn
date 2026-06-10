/**
 * Sub-AC 4c: 분기 옵션 선택 시 sl_branch_select 계측 검증
 *
 * - "평가 보기" 클릭 후 BranchDialog에서 옵션 선택 시 logEvent("sl_branch_select", ...) 호출 여부 검증
 * - stepIdx + choice(option.label) 파라미터 검증
 * - analytics 모듈은 vitest.setup.ts 의 전역 vi.mock 으로 no-op 대체됨
 *   (컴포넌트가 GA4 전송 없이 올바른 파라미터로 logEvent 를 호출하는지만 검사)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as analytics from "../lib/analytics";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

const mockBranchOptions = [
  {
    label: "다음 로드맵 - 일시중단 함수",
    type: "roadmap_next",
    isRecommended: true,
    stageContent: { id: 3, title: "일시중단 함수", desc: "suspend", body: "", questions: [] },
  },
  {
    label: "여기서 학습을 마치기",
    type: "exit",
    isRecommended: false,
    stageContent: null,
  },
];

// 학습 콘텐츠 로드(네트워크/Claude)를 stub 해 격리한다.
vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  generateProbeQuestions: vi.fn(async () => []),
  generateRoadmapOutline: vi.fn(async () => [
    { title: "단계 1", desc: "설명 1" },
  ]),
  generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({
    evaluations: [{ id: "q1", grade: "correct", feedback: "잘했어요" }],
  })),
  generateBranchEvaluation: vi.fn(async () => ({
    evaluationText: "부분 정답입니다.",
    isMerged: false,
    branchOptions: mockBranchOptions,
  })),
}));

// 원격 세션 API stub
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

function renderApp(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

/**
 * body + questions 가 있는 steps 를 포함한 learn 세션 시드.
 * LearnContentProvider 가 즉시 "ready" 상태로 초기화된다.
 * mode: "socratic" - 분기 시스템이 활성화됨.
 */
function seedLearnSession(sessionId: string) {
  localStorage.setItem(
    sessionKey(sessionId),
    JSON.stringify({
      sessionId,
      createdAt: 1000,
      conceptSummary: "TypeScript 기초",
      stage: "learn",
      mode: "socratic",
      concept: "TypeScript 기초",
      materials: "",
      probes: {},
      estimatedLevel: 2,
      stepIdx: 0,
      answers: {},
      skips: {},
      steps: [
        {
          id: 1,
          title: "단계 1",
          desc: "설명 1",
          body: "본문 1",
          questions: [{ id: "q1", q: "질문 1?" }],
        },
      ],
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 4c: sl_branch_select 계측", () => {
  test("분기 옵션 선택 시 sl_branch_select 가 stepIdx + choice 와 함께 호출됨", async () => {
    const sessionId = "s-branch-select-basic";
    seedLearnSession(sessionId);

    renderApp([`/s/${sessionId}/learn/0`]);

    // "답변 제출하기" 버튼 등장 대기 후 클릭
    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    // 답변 평가 + 분기 평가 완료 후 "평가 보기" 버튼 등장 대기
    const reviewBtn = await screen.findByText("평가 보기");
    fireEvent.click(reviewBtn);

    // 분기 다이얼로그에서 옵션 클릭
    const option = await screen.findByText("다음 로드맵 - 일시중단 함수");
    fireEvent.click(option);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_branch_select", {
        session_id: sessionId,
        step_idx: 0,
        choice: "다음 로드맵 - 일시중단 함수",
      });
    });
  });

  test("exit 타입 옵션 선택 시에도 sl_branch_select 가 호출됨", async () => {
    const sessionId = "s-branch-select-exit";
    seedLearnSession(sessionId);

    renderApp([`/s/${sessionId}/learn/0`]);

    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    const reviewBtn = await screen.findByText("평가 보기");
    fireEvent.click(reviewBtn);

    const exitOption = await screen.findByText("여기서 학습을 마치기");
    fireEvent.click(exitOption);

    await waitFor(() => {
      expect(analytics.logEvent).toHaveBeenCalledWith("sl_branch_select", {
        session_id: sessionId,
        step_idx: 0,
        choice: "여기서 학습을 마치기",
      });
    });
  });

  test("sl_branch_select 파라미터는 순수 도메인 값(session_id, step_idx, choice)만 포함함", async () => {
    const sessionId = "s-branch-select-params";
    seedLearnSession(sessionId);

    renderApp([`/s/${sessionId}/learn/0`]);

    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    const reviewBtn = await screen.findByText("평가 보기");
    fireEvent.click(reviewBtn);

    const option = await screen.findByText("다음 로드맵 - 일시중단 함수");
    fireEvent.click(option);

    await waitFor(() => {
      const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
      const branchCall = calls.find(([name]) => name === "sl_branch_select");
      expect(branchCall).toBeDefined();
      expect(branchCall?.[1]).toEqual({
        session_id: sessionId,
        step_idx: 0,
        choice: "다음 로드맵 - 일시중단 함수",
      });
    });
  });
});
