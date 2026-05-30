import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../api/claudeContent", () => {
  return {
    ClaudeContentError: class ClaudeContentError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
    generateProbeQuestions: vi.fn(async () => [
      {
        id: "p1",
        kind: "choice",
        q: "예시 질문",
        options: [
          { value: 0, label: "처음이에요" },
          { value: 1, label: "들어봤어요" },
        ],
      },
    ]),
    generateRoadmapOutline: vi.fn(async () => [
      { title: "단계 1", desc: "설명 1" },
      { title: "단계 2", desc: "설명 2" },
      { title: "단계 3", desc: "설명 3" },
    ]),
    generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
    generateAnswerEvaluation: vi.fn(async () => ({})),
  };
});

import App from "../App";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AC1: 주제 입력 후 로드맵이 생성된다", () => {
  test("주제 input에 텍스트 입력 후 시작 버튼 클릭 시 ProgressBar에 칩이 렌더된다", async () => {
    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByPlaceholderText(
      "배우고 싶은 개념을 입력해서 시작해보세요",
    );
    await user.clear(textarea);
    await user.type(textarea, "테스트 개념");

    const startBtn = screen.getByRole("button", { name: "학습 시작" });
    await user.click(startBtn);

    // After clicking start, stage becomes "probe" which renders ProgressBar with PHASES chips.
    // Sidebar 의 세션 행에도 stage 라벨이 표시되므로 ProgressBar 영역으로 한정해 검색한다.
    const phaseBar = await screen.findByText("개념 입력").then((el) =>
      el.closest(".phase-bar"),
    );
    expect(phaseBar).not.toBeNull();
    const inPhaseBar = within(phaseBar as HTMLElement);
    expect(inPhaseBar.getByText("개념 입력")).toBeInTheDocument();
    expect(inPhaseBar.getByText("수준 확인")).toBeInTheDocument();
    expect(inPhaseBar.getByText("학습 진행")).toBeInTheDocument();
    expect(inPhaseBar.getByText("완료")).toBeInTheDocument();
  });
});
