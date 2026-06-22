/**
 * AC: Hero 학습 주제(A)는 검증 게이트를 거친다.
 * - 부적합(valid=false): 우회 없는 차단 모달이 뜨고 probe(generateProbeQuestions)를 호출하지 않는다.
 * - 유효(valid=true): 검증을 통과해 probe 단계로 진행한다(generateProbeQuestions 호출).
 *
 * validateInput 이 valid=true 를 반환해야만 다음 Sonnet 호출이 일어남을 확인한다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import * as claude from "../api/claudeContent";

vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  validateInput: vi.fn(async () => true),
  generateProbeQuestions: vi.fn(async () => []),
  generateRoadmapOutline: vi.fn(async () => [{ title: "단계 1", desc: "설명 1" }]),
  generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({})),
  generateBranchEvaluation: vi.fn(async () => ({})),
  generatePrereqTree: vi.fn(async () => []),
  askLearnQuestion: vi.fn(async () => ({ route: "none", answer: "", message: "", suggestedStep: null })),
}));

vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

const MODAL_TEXT = "학습에 사용할 수 있는 내용을 입력해 주세요.";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
}

async function typeConceptAndStart(text: string) {
  const ta = await screen.findByPlaceholderText("배우고 싶은 개념을 입력해서 시작해보세요");
  await userEvent.type(ta, text);
  await userEvent.click(screen.getByRole("button", { name: "학습 시작" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Hero 학습 주제(A) 검증 게이트", () => {
  test("부적합(valid=false): 차단 모달이 뜨고 generateProbeQuestions 를 호출하지 않는다", async () => {
    vi.mocked(claude.validateInput).mockResolvedValueOnce(false);
    renderHome();
    await typeConceptAndStart("asdfasdf");

    expect(await screen.findByText(MODAL_TEXT)).toBeTruthy();
    expect(claude.validateInput).toHaveBeenCalledWith("asdfasdf");
    expect(claude.generateProbeQuestions).not.toHaveBeenCalled();
  });

  test("유효(valid=true): probe 단계로 진행해 generateProbeQuestions 가 호출된다", async () => {
    vi.mocked(claude.validateInput).mockResolvedValueOnce(true);
    renderHome();
    await typeConceptAndStart("미분");

    await waitFor(() => expect(claude.generateProbeQuestions).toHaveBeenCalled());
    expect(screen.queryByText(MODAL_TEXT)).toBeNull();
  });

  test("검증 게이트 장애(throw): 학습을 막지 않고 통과시킨다(fail-open)", async () => {
    vi.mocked(claude.validateInput).mockRejectedValueOnce(new Error("network"));
    renderHome();
    await typeConceptAndStart("미분");

    await waitFor(() => expect(claude.generateProbeQuestions).toHaveBeenCalled());
    expect(screen.queryByText(MODAL_TEXT)).toBeNull();
  });
});
