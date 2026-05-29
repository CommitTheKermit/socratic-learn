import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

import * as persist from "../state/sessionPersist";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

const ACTIVE_KEY = "socratic:activeSessionId";
const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";

function seededState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: "seed-1",
    createdAt: 111,
    conceptSummary: "복원될 개념",
    stage: "input",
    depth: "2depth",
    concept: "복원될 개념",
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
});

describe("Sub-AC 4: App.tsx 마운트 load 복원 / 상태 변경 persist 통합", () => {
  test("마운트 시 활성 세션을 load 하여 초기 concept 상태를 복원한다", () => {
    localStorage.setItem(ACTIVE_KEY, "seed-1");
    localStorage.setItem(sessionKey("seed-1"), JSON.stringify(seededState()));

    const loadSpy = vi.spyOn(persist, "loadSession");
    render(<App />);

    expect(loadSpy).toHaveBeenCalledWith("seed-1");
    const textarea = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    expect(textarea.value).toBe("복원될 개념");
  });

  test("저장된 세션이 없으면 새 활성 세션 id 를 만들어 초기 상태를 persist 한다", () => {
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
    render(<App />);

    const activeId = localStorage.getItem(ACTIVE_KEY);
    expect(activeId).toBeTruthy();
    const restored = persist.loadSession(activeId!);
    expect(restored).not.toBeNull();
    expect(restored!.sessionId).toBe(activeId);
  });

  test("상태 변경 시 persistSession 이 호출되어 변경된 상태가 localStorage 에 기록된다", async () => {
    const user = userEvent.setup();
    const persistSpy = vi.spyOn(persist, "persistSession");
    render(<App />);

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "새 개념 X");

    expect(persistSpy).toHaveBeenCalled();
    const activeId = localStorage.getItem(ACTIVE_KEY)!;
    expect(activeId).toBeTruthy();
    const restored = persist.loadSession(activeId);
    expect(restored!.concept).toBe("새 개념 X");
  });

  test("복원된 상태가 변경되면 동일 세션 키에 갱신된 상태가 저장된다(라운드트립)", async () => {
    localStorage.setItem(ACTIVE_KEY, "seed-1");
    localStorage.setItem(sessionKey("seed-1"), JSON.stringify(seededState()));

    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "수정됨");

    const restored = persist.loadSession("seed-1");
    expect(restored!.concept).toBe("수정됨");
    expect(restored!.depth).toBe("2depth"); // 복원된 다른 필드는 유지
  });
});
