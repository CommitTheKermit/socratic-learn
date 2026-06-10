/**
 * Sub-AC 3b: 이전/다음 버튼 클릭 시 sl_step_navigate 계측 검증
 *
 * - goPrev(stepIdx>0): direction:"back", from_idx, to_idx 검증
 * - goNext(isEvaluated=true): direction:"next", from_idx, to_idx 검증
 * - analytics 모듈은 vitest.setup.ts 의 전역 vi.mock 으로 no-op 대체됨
 *   (컴포넌트가 GA4 전송 없이 올바른 파라미터로 logEvent 를 호출하는지만 검사)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    { title: "단계 2", desc: "설명 2" },
  ]),
  generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({})),
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
 * 로드맵이 이미 복원된(steps 포함) learn 세션을 시드한다.
 * steps + stepEvaluations 가 있으면 LearnContentProvider 가 즉시 "ready" 상태로 초기화된다.
 */
function seedLearnSessionWithSteps(
  sessionId: string,
  stepIdx = 0,
  withEvalAt?: number,
) {
  const steps = [
    {
      id: 1,
      title: "단계 1",
      desc: "설명 1",
      body: "본문 1",
      questions: [{ id: "q1", q: "질문 1?" }],
    },
    {
      id: 2,
      title: "단계 2",
      desc: "설명 2",
      body: "본문 2",
      questions: [{ id: "q2", q: "질문 2?" }],
    },
  ];

  // withEvalAt 이 있으면 해당 stepIdx 의 평가 결과를 심어 isEvaluated=true 로 만든다.
  const stepEvaluations =
    withEvalAt !== undefined
      ? {
          [withEvalAt]: {
            evaluations: [{ id: "q1", grade: "correct", feedback: "좋아요" }],
          },
        }
      : undefined;

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
      skips: {},
      steps,
      ...(stepEvaluations ? { stepEvaluations } : {}),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Sub-AC 3b: sl_step_navigate 계측", () => {
  test("이전 버튼 클릭 시 sl_step_navigate(direction:'back')가 호출됨", async () => {
    const sessionId = "s-nav-back";
    // stepIdx=1 에서 시작 - 이전 버튼이 "이전 개념"으로 노출됨
    seedLearnSessionWithSteps(sessionId, 1);

    renderApp([`/s/${sessionId}/learn/1`]);

    // 로드맵이 복원된 상태라 footer 가 즉시 렌더됨
    const prevBtn = await screen.findByText(/이전 개념/);
    fireEvent.click(prevBtn);

    expect(analytics.logEvent).toHaveBeenCalledWith("sl_step_navigate", {
      session_id: sessionId,
      from_idx: 1,
      to_idx: 0,
      direction: "back",
    });
  });

  test("다음 버튼 클릭 시 sl_step_navigate(direction:'next')가 호출됨", async () => {
    const sessionId = "s-nav-next";
    // stepIdx=0, 평가 완료 상태(isEvaluated=true) 로 시드
    seedLearnSessionWithSteps(sessionId, 0, 0);

    renderApp([`/s/${sessionId}/learn/0`]);

    const nextBtn = await screen.findByText(/다음 개념/);
    fireEvent.click(nextBtn);

    expect(analytics.logEvent).toHaveBeenCalledWith("sl_step_navigate", {
      session_id: sessionId,
      from_idx: 0,
      to_idx: 1,
      direction: "next",
    });
  });

  test("sl_step_navigate 파라미터에 환경 분기 코드 없음 - 순수 도메인 값만 포함", async () => {
    const sessionId = "s-nav-params";
    seedLearnSessionWithSteps(sessionId, 1);

    renderApp([`/s/${sessionId}/learn/1`]);

    const prevBtn = await screen.findByText(/이전 개념/);
    fireEvent.click(prevBtn);

    await waitFor(() => {
      const calls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls;
      const navCall = calls.find(([name]) => name === "sl_step_navigate");
      expect(navCall).toBeDefined();
      expect(navCall?.[1]).toEqual({
        session_id: sessionId,
        from_idx: 1,
        to_idx: 0,
        direction: "back",
      });
    });
  });

  test("stepIdx=0 에서 이전 버튼 클릭 시 sl_step_navigate 를 호출하지 않음(onPrev 호출)", async () => {
    const sessionId = "s-nav-first-step";
    seedLearnSessionWithSteps(sessionId, 0);

    renderApp([`/s/${sessionId}/learn/0`]);

    const prevBtn = await screen.findByText(/수준 확인 다시 보기/);
    fireEvent.click(prevBtn);

    // stepIdx=0 에서 이전은 onPrev() 호출 - sl_step_navigate 없음
    const navCalls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([name]) => name === "sl_step_navigate",
    );
    expect(navCalls).toHaveLength(0);
  });

  test("마지막 스텝에서 다음 버튼 클릭 시 sl_step_navigate 를 호출하지 않음(onDone 호출)", async () => {
    const sessionId = "s-nav-last-step";
    // 2개 스텝 중 stepIdx=1(마지막), 평가 완료
    seedLearnSessionWithSteps(sessionId, 1, 1);

    renderApp([`/s/${sessionId}/learn/1`]);

    const nextBtn = await screen.findByText(/학습 마치기/);
    fireEvent.click(nextBtn);

    // 마지막 스텝에서 다음은 onDone() 호출 - sl_step_navigate 없음
    const navCalls = (analytics.logEvent as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([name]) => name === "sl_step_navigate",
    );
    expect(navCalls).toHaveLength(0);
  });
});
