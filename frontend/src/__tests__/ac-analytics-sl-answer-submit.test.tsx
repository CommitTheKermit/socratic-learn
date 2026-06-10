/**
 * Sub-AC 4a: 답변 제출 버튼 클릭 시 sl_answer_submit 계측 검증
 *
 * - "답변 제출하기" 버튼 클릭 시 logEvent("sl_answer_submit", ...) 호출 여부 검증
 * - 스킵된 질문은 계측 제외 검증
 * - analytics 모듈은 vitest.setup.ts 의 전역 vi.mock 으로 no-op 대체됨
 *   (컴포넌트가 GA4 전송 없이 올바른 파라미터로 logEvent 를 호출하는지만 검사)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as analytics from "../lib/analytics";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

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
  generateAnswerEvaluation: vi.fn(
    async () => ({ evaluations: [{ id: "q1", grade: "correct", feedback: "좋아요" }] }),
  ),
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
 * 로드맵이 복원된(steps 포함) learn 세션 시드.
 * steps 에 body + questions 가 있으면 LearnContentProvider 가 즉시 "ready" 상태로 초기화된다.
 */
function seedLearnSessionWithQuestions(
  sessionId: string,
  opts: {
    stepIdx?: number;
    questions?: Array<{ id: string; q: string }>;
    skips?: Record<string, boolean>;
  } = {},
) {
  const { stepIdx = 0, questions = [{ id: "q1", q: "질문 1?" }], skips = {} } = opts;

  const steps = [
    {
      id: 1,
      title: "단계 1",
      desc: "설명 1",
      body: "본문 1",
      questions,
    },
  ];

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
      stepIdx,
      answers: {},
      skips,
      steps,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 4a: sl_answer_submit 계측", () => {
  test("답변 제출 버튼 클릭 시 sl_answer_submit 이 step_idx + question_id 와 함께 호출됨", async () => {
    const sessionId = "s-submit-basic";
    seedLearnSessionWithQuestions(sessionId, { stepIdx: 0, questions: [{ id: "q1", q: "질문 1?" }] });

    renderApp([`/s/${sessionId}/learn/0`]);

    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    expect(analytics.logEvent).toHaveBeenCalledWith("sl_answer_submit", {
      session_id: sessionId,
      step_idx: 0,
      question_id: "q1",
    });
  });

  test("여러 질문이 있을 때 각 질문마다 sl_answer_submit 이 호출됨", async () => {
    const sessionId = "s-submit-multi";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [
        { id: "q1", q: "질문 1?" },
        { id: "q2", q: "질문 2?" },
      ],
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    expect(analytics.logEvent).toHaveBeenCalledWith("sl_answer_submit", {
      session_id: sessionId,
      step_idx: 0,
      question_id: "q1",
    });
    expect(analytics.logEvent).toHaveBeenCalledWith("sl_answer_submit", {
      session_id: sessionId,
      step_idx: 0,
      question_id: "q2",
    });
  });

  test("스킵된 질문은 sl_answer_submit 이벤트에서 제외됨", async () => {
    const sessionId = "s-submit-skip";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [
        { id: "q1", q: "질문 1?" },
        { id: "q2", q: "질문 2?" },
      ],
      skips: { q1: true },
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    // q1 은 스킵되었으므로 이벤트 없음
    const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
    const submitCalls = calls.filter(([name]) => name === "sl_answer_submit");
    expect(submitCalls).toHaveLength(1);
    expect(submitCalls[0][1]).toEqual({
      session_id: sessionId,
      step_idx: 0,
      question_id: "q2",
    });
  });

  test("sl_answer_submit 파라미터는 환경 분기 없이 순수 도메인 값(session_id, step_idx, question_id)만 포함함", async () => {
    const sessionId = "s-submit-params";
    seedLearnSessionWithQuestions(sessionId, { stepIdx: 0, questions: [{ id: "q-abc", q: "질문?" }] });

    renderApp([`/s/${sessionId}/learn/0`]);

    const submitBtn = await screen.findByText("답변 제출하기");
    fireEvent.click(submitBtn);

    const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
    const submitCall = calls.find(([name]) => name === "sl_answer_submit");
    expect(submitCall).toBeDefined();
    expect(submitCall?.[1]).toEqual({
      session_id: sessionId,
      step_idx: 0,
      question_id: "q-abc",
    });
  });
});
