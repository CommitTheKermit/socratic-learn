import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { persistSession, loadSession } from "../state/sessionPersist";
import { createSessionState } from "../state/sessionState";
import { generateAnswerEvaluation, generateRoadmapOutline, generateStepDetail } from "../api/claudeContent";
import { streamStepDetail } from "../api/stepDetailStream";
import { saveLanguage } from "../i18n/language";

vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined), saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []), getSessionRemote: vi.fn(async () => null),
}));
vi.mock("../api/testEligible", () => ({ fetchTestEligible: vi.fn(async () => false) }));
vi.mock("../api/stepDetailStream", () => ({ streamStepDetail: vi.fn() }));
vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class extends Error {},
  generateProbeQuestions: vi.fn(), generateRoadmapOutline: vi.fn(), generateStepDetail: vi.fn(),
  generateAnswerEvaluation: vi.fn(async () => ({ evaluations: [{ id: "q1", grade: "correct", feedback: "You explained the key idea correctly." }] })),
}));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

it("preserves saved Korean explanations and learner answers while showing new English feedback", async () => {
  saveLanguage("en");
  persistSession({
    ...createSessionState({ sessionId: "saved-ko", createdAt: 1, concept: "변수", mode: "light" }),
    stage: "learn", estimatedLevel: 1,
    answers: { q1: "값에 이름을 붙입니다." },
    steps: [{ id: 1, title: "변수의 역할", desc: "기존 설명", body: "이 설명은 저장된 한국어 원문입니다.", questions: [{ id: "q1", q: "변수는 무엇인가요?" }] }],
  });
  render(<MemoryRouter initialEntries={["/s/saved-ko/learn/0"]}><App /></MemoryRouter>);
  expect(await screen.findByText("이 설명은 저장된 한국어 원문입니다.")).toBeInTheDocument();
  expect(screen.getByDisplayValue("값에 이름을 붙입니다.")).toBeInTheDocument();
  expect(generateRoadmapOutline).not.toHaveBeenCalled();
  expect(generateStepDetail).not.toHaveBeenCalled();
  expect(streamStepDetail).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Submit answers" }));
  expect(await screen.findByText("You explained the key idea correctly.")).toBeInTheDocument();
  expect(generateAnswerEvaluation).toHaveBeenCalledWith("변수", 1, "변수의 역할", "기존 설명", "이 설명은 저장된 한국어 원문입니다.", [{ id: "q1", q: "변수는 무엇인가요?", answer: "값에 이름을 붙입니다." }], "light");
  await waitFor(() => expect(loadSession("saved-ko")?.answers.q1).toBe("값에 이름을 붙입니다."));
});
