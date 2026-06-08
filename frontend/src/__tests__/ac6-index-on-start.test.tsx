import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// 학습 단계의 콘텐츠 로딩(네트워크/Claude)을 stub 하여 렌더 테스트를 격리한다.
vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  generateProbeQuestions: vi.fn(async () => []),
  generateRoadmapOutline: vi.fn(async () => [{ title: "단계 1", desc: "설명 1" }]),
  generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({})),
}));

import App from "../App";
import { loadSession } from "../state/sessionPersist";

const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";
const DRAFT_CONCEPT_KEY = "socratic:draft:concept";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("히스토리는 '학습 시작' 시점에만 사이드바에 등록된다", () => {
  test("홈(input)에서 개념을 입력해도 세션으로 등록되지 않고 초안만 보관한다", async () => {
    const user = userEvent.setup();
    renderHome();

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "코루틴이 왜 필요한지");

    // 홈 입력은 세션이 아니라 초안(draft) 으로만 저장된다(새로고침 대비).
    expect(localStorage.getItem(DRAFT_CONCEPT_KEY)).toBe("코루틴이 왜 필요한지");
    // 아직 세션이 발급되지 않았다.
    expect(localStorage.getItem("socratic:activeSessionId")).toBeNull();
    // 사이드바 히스토리에도 항목이 없다.
    expect(screen.getByText("히스토리가 없습니다")).toBeInTheDocument();
  });

  test("'학습 시작'(probe 전이) 후 세션이 발급되어 사이드바 목록에 나타난다", async () => {
    const user = userEvent.setup();
    renderHome();

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "코루틴이 왜 필요한지");
    await user.click(screen.getByRole("button", { name: "학습 시작" }));

    // 발급된 세션이 사이드바 히스토리 항목으로 나타난다.
    await waitFor(() => {
      const item = screen
        .getAllByText("코루틴이 왜 필요한지")
        .map((el) => el.closest(".sb-history-item"))
        .find(Boolean);
      expect(item).toBeTruthy();
    });
    // 발급된 세션 본문도 그 개념으로 저장되어 있다.
    const activeId = localStorage.getItem("socratic:activeSessionId")!;
    expect(activeId).toBeTruthy();
    expect(loadSession(activeId)!.concept).toBe("코루틴이 왜 필요한지");
  });
});
