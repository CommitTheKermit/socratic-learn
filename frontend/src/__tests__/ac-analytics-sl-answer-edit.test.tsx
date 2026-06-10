/**
 * Sub-AC 4b: 답변 수정(onBlur) 시 sl_answer_edit 계측 검증
 *
 * - 답변 textarea 에 값이 있고 포커스를 잃을 때 logEvent("sl_answer_edit", ...) 호출 여부 검증
 * - 빈 답변에서는 sl_answer_edit 미호출 검증
 * - 평가 후 잠긴(locked) 상태에서는 sl_answer_edit 미호출 검증
 * - analytics 모듈은 vitest.setup.ts 의 전역 vi.mock 으로 no-op 대체됨
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
    answers?: Record<string, string>;
    stepEvaluations?: Record<number, { evaluations: Array<{ id: string; grade: string; feedback: string }> }>;
  } = {},
) {
  const {
    stepIdx = 0,
    questions = [{ id: "q1", q: "질문 1?" }],
    answers = {},
    stepEvaluations,
  } = opts;

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
      answers,
      skips: {},
      steps,
      stepEvaluations,
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 4b: sl_answer_edit 계측", () => {
  test("답변 textarea 에 값 입력 후 포커스 이탈 시 sl_answer_edit 이 step_idx + question_id 와 함께 호출됨", async () => {
    const sessionId = "s-edit-basic";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [{ id: "q1", q: "질문 1?" }],
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    // 질문 텍스트가 렌더될 때까지 대기
    const textarea = await screen.findByPlaceholderText(/.+/);

    // 답변 입력 후 포커스 이탈
    fireEvent.change(textarea, { target: { value: "내 답변" } });
    fireEvent.blur(textarea);

    expect(analytics.logEvent).toHaveBeenCalledWith("sl_answer_edit", {
      session_id: sessionId,
      step_idx: 0,
      question_id: "q1",
    });
  });

  test("여러 질문 중 특정 textarea 에서 blur 시 해당 question_id 만 sl_answer_edit 으로 호출됨", async () => {
    const sessionId = "s-edit-multi";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [
        { id: "q1", q: "질문 1?" },
        { id: "q2", q: "질문 2?" },
      ],
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    const textareas = await screen.findAllByPlaceholderText(/.+/);
    // 첫 번째 textarea 에만 값 입력 후 blur
    fireEvent.change(textareas[0], { target: { value: "q1 답변" } });
    fireEvent.blur(textareas[0]);

    const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
    const editCalls = calls.filter(([name]) => name === "sl_answer_edit");
    expect(editCalls).toHaveLength(1);
    expect(editCalls[0][1]).toEqual({
      session_id: sessionId,
      step_idx: 0,
      question_id: "q1",
    });
  });

  test("빈 textarea 에서 blur 시 sl_answer_edit 이 호출되지 않음", async () => {
    const sessionId = "s-edit-empty";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [{ id: "q1", q: "질문 1?" }],
      answers: {},
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    const textarea = await screen.findByPlaceholderText(/.+/);
    // 값 없이 blur
    fireEvent.blur(textarea);

    const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
    const editCalls = calls.filter(([name]) => name === "sl_answer_edit");
    expect(editCalls).toHaveLength(0);
  });

  test("평가 완료 후 잠긴(locked) textarea blur 시 sl_answer_edit 이 호출되지 않음", async () => {
    const sessionId = "s-edit-locked";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [{ id: "q1", q: "질문 1?" }],
      answers: { q1: "이미 제출한 답변" },
      // stepEvaluations 가 있으면 isEvaluated=true(locked), textarea readOnly 됨
      stepEvaluations: {
        0: { evaluations: [{ id: "q1", grade: "correct", feedback: "좋아요" }] },
      },
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    // 답변 값으로 textarea 를 찾아 readOnly 확인 후 blur
    const textarea = await screen.findByDisplayValue("이미 제출한 답변");
    expect(textarea).toHaveAttribute("readonly");
    fireEvent.blur(textarea);

    const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
    const editCalls = calls.filter(([name]) => name === "sl_answer_edit");
    expect(editCalls).toHaveLength(0);
  });

  test("sl_answer_edit 파라미터는 환경 분기 없이 순수 도메인 값(session_id, step_idx, question_id)만 포함함", async () => {
    const sessionId = "s-edit-params";
    seedLearnSessionWithQuestions(sessionId, {
      stepIdx: 0,
      questions: [{ id: "q-abc", q: "도메인 질문?" }],
    });

    renderApp([`/s/${sessionId}/learn/0`]);

    const textarea = await screen.findByPlaceholderText(/.+/);
    fireEvent.change(textarea, { target: { value: "답변 내용" } });
    fireEvent.blur(textarea);

    const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
    const editCall = calls.find(([name]) => name === "sl_answer_edit");
    expect(editCall).toBeDefined();
    expect(editCall?.[1]).toEqual({
      session_id: sessionId,
      step_idx: 0,
      question_id: "q-abc",
    });
  });
});
