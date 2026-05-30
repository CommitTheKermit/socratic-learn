import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

import * as sessionIndex from "../state/sessionIndex";
import { upsertSessionMeta } from "../state/sessionIndex";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

const ACTIVE_KEY = "socratic:activeSessionId";
const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";

function seededState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: "seed-1",
    createdAt: 111,
    conceptSummary: "개념",
    stage: "input",
    depth: "2depth",
    concept: "개념",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    explainStreamComplete: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("AC2: App.tsx deleteSession", () => {
  test("활성 세션 삭제 시 removeSessionMeta+removeItem 호출 후 새 세션으로 input 초기화", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(
        seededState({ sessionId: "active-1", stage: "probe", concept: "활성개념", conceptSummary: "활성개념" }),
      ),
    );
    upsertSessionMeta({ sessionId: "active-1", createdAt: 5, conceptSummary: "활성개념", stage: "probe" });

    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    render(<App />);

    const item = screen.getByText("활성개념").closest(".sb-history-item") as HTMLElement;
    await user.click(within(item).getByLabelText("세션 삭제"));

    expect(removeMetaSpy).toHaveBeenCalledWith("active-1");
    expect(removeItemSpy).toHaveBeenCalledWith(sessionKey("active-1"));

    // 활성 세션이었으므로 input 단계의 빈 세션으로 초기화된다.
    const textarea = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
    // 새 sessionId 가 발급되어 활성 키가 갱신된다.
    expect(localStorage.getItem(ACTIVE_KEY)).not.toBe("active-1");
    expect(localStorage.getItem(ACTIVE_KEY)).toBeTruthy();
    // 삭제된 세션의 본문 키는 제거되었다.
    expect(localStorage.getItem(sessionKey("active-1"))).toBeNull();
  });

  test("비활성 세션 삭제 시 인덱스/본문 키만 제거하고 활성 세션은 유지한다", async () => {
    localStorage.setItem(ACTIVE_KEY, "active-1");
    localStorage.setItem(
      sessionKey("active-1"),
      JSON.stringify(seededState({ sessionId: "active-1", concept: "활성개념", conceptSummary: "활성개념" })),
    );
    localStorage.setItem(
      sessionKey("other-2"),
      JSON.stringify(seededState({ sessionId: "other-2", concept: "다른개념", conceptSummary: "다른개념" })),
    );
    upsertSessionMeta({ sessionId: "active-1", createdAt: 5, conceptSummary: "활성개념", stage: "input" });
    upsertSessionMeta({ sessionId: "other-2", createdAt: 2, conceptSummary: "다른개념", stage: "input" });

    const removeMetaSpy = vi.spyOn(sessionIndex, "removeSessionMeta");
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const user = userEvent.setup();
    render(<App />);

    const item = screen.getByText("다른개념").closest(".sb-history-item") as HTMLElement;
    await user.click(within(item).getByLabelText("세션 삭제"));

    expect(removeMetaSpy).toHaveBeenCalledWith("other-2");
    expect(removeItemSpy).toHaveBeenCalledWith(sessionKey("other-2"));

    // 활성 세션은 그대로 유지된다.
    expect(localStorage.getItem(ACTIVE_KEY)).toBe("active-1");
    expect(localStorage.getItem(sessionKey("other-2"))).toBeNull();
    expect(localStorage.getItem(sessionKey("active-1"))).not.toBeNull();
    // 비활성 삭제는 인덱스에서만 사라진다.
    expect(sessionIndex.listSessions().some((m) => m.sessionId === "other-2")).toBe(false);
  });
});
