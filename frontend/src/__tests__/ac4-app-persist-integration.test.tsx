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

import * as persist from "../state/sessionPersist";
import { sessionKey } from "../state/sessionPersist";
import App from "../App";

const ACTIVE_KEY = "socratic:activeSessionId";
const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";

function renderApp(entries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

function seededState(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId: "seed-1",
    createdAt: 111,
    conceptSummary: "복원될 개념",
    stage: "input",
    mode: "2depth",
    concept: "복원될 개념",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Sub-AC 4: 루트 재접속 동작 / 상태 변경 persist 통합", () => {
  test("루트('/') 진입 시 활성 세션이 있어도 복원하지 않고 빈 입력 화면을 보여준다", async () => {
    localStorage.setItem(ACTIVE_KEY, "seed-1");
    localStorage.setItem(sessionKey("seed-1"), JSON.stringify(seededState()));

    renderApp(["/"]);

    // 루트는 항상 홈(input). 마지막 활성 세션의 concept 을 자동 복원하지 않는다.
    expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("input");
    const textarea = (await screen.findByPlaceholderText(PLACEHOLDER)) as HTMLTextAreaElement;
    expect(textarea.value).toBe("");
  });

  test("활성 세션이 진행 단계(learn)여도 루트 진입 시 복원하지 않고 입력 화면을 보여준다", async () => {
    localStorage.setItem(ACTIVE_KEY, "seed-1");
    localStorage.setItem(
      sessionKey("seed-1"),
      JSON.stringify(seededState({ stage: "learn", estimatedLevel: 2, concept: "복원될 개념" })),
    );

    renderApp(["/"]);

    // 루트는 항상 input. learn 단계 세션이어도 자동으로 그 단계로 이동하지 않는다.
    expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("input");
    // 세션 본문 캐시 자체는 보존된다(사이드바에서 직접 열면 이어볼 수 있다).
    expect(persist.loadSession("seed-1")!.stage).toBe("learn");
  });

  test("저장된 활성 세션이 없으면 홈(input) 화면을 보여주고 새 세션을 만들지 않는다", () => {
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
    renderApp(["/"]);

    expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("input");
    // 마운트만으로는 활성 세션이 발급되지 않는다(학습 시작 시점에 발급).
    expect(localStorage.getItem(ACTIVE_KEY)).toBeNull();
  });

  test("'학습 시작' 시 세션이 발급되고 persistSession 으로 localStorage 에 기록된다", async () => {
    const user = userEvent.setup();
    const persistSpy = vi.spyOn(persist, "persistSession");
    renderApp(["/"]);

    const textarea = screen.getByPlaceholderText(PLACEHOLDER);
    await user.clear(textarea);
    await user.type(textarea, "새 개념 X");
    await user.click(screen.getByRole("button", { name: "학습 시작" }));

    expect(persistSpy).toHaveBeenCalled();
    await waitFor(() => expect(localStorage.getItem(ACTIVE_KEY)).toBeTruthy());
    const activeId = localStorage.getItem(ACTIVE_KEY)!;
    const restored = persist.loadSession(activeId);
    expect(restored!.concept).toBe("새 개념 X");
  });

  test("세션 URL 직접 진입 후 concept 을 변경하면 동일 세션 키에 갱신 저장된다(라운드트립)", async () => {
    localStorage.setItem(sessionKey("seed-1"), JSON.stringify(seededState()));

    const user = userEvent.setup();
    renderApp(["/s/seed-1"]);

    const textarea = (await screen.findByPlaceholderText(PLACEHOLDER)) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe("복원될 개념"));
    await user.clear(textarea);
    await user.type(textarea, "수정됨");

    await waitFor(() => expect(persist.loadSession("seed-1")!.concept).toBe("수정됨"));
    expect(persist.loadSession("seed-1")!.mode).toBe("2depth"); // 복원된 다른 필드는 유지
  });
});
