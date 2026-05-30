import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
import { listSessions } from "../state/sessionIndex";
import { loadSession } from "../state/sessionPersist";

const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("히스토리 인덱스는 '학습 시작' 시점에만 등록된다", () => {
  test("input 단계에서 개념을 입력해도 인덱스(사이드바 목록)에는 등록되지 않는다", async () => {
    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "코루틴이 왜 필요한지");

    // 본문 초안은 복원용으로 저장되지만(새로고침 대비),
    const activeId = localStorage.getItem("socratic:activeSessionId")!;
    expect(loadSession(activeId)!.concept).toBe("코루틴이 왜 필요한지");
    // 사이드바 히스토리 인덱스에는 아직 등록되지 않는다.
    expect(listSessions()).toHaveLength(0);
    expect(screen.getByText("히스토리가 없습니다")).toBeInTheDocument();
  });

  test("'학습 시작'(probe 전이) 후 인덱스에 등록되어 사이드바 목록에 나타난다", async () => {
    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "코루틴이 왜 필요한지");
    await user.click(screen.getByRole("button", { name: "학습 시작" }));

    await waitFor(() => expect(listSessions()).toHaveLength(1));
    expect(listSessions()[0].conceptSummary).toBe("코루틴이 왜 필요한지");
    const item = screen.getByText("코루틴이 왜 필요한지").closest(".sb-history-item");
    expect(item).not.toBeNull();
  });
});
