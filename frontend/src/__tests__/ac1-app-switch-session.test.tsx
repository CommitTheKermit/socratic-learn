import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

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
import { persistSession, loadSession } from "../state/sessionPersist";
import { listSessions } from "../state/sessionIndex";
import type { SessionState } from "../state/sessionState";

const ACTIVE_SESSION_KEY = "socratic:activeSessionId";

function makeState(id: string, concept: string, over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: id,
    createdAt: 4242,
    conceptSummary: concept,
    stage: "done",
    depth: "intermediate",
    concept,
    materials: "자료들",
    probes: { "0": "이해" },
    estimatedLevel: 2,
    stepIdx: 3,
    answers: { "0": "답" },
    skips: { "1": true },
    ...over,
  };
}

function clickOpen(conceptText: string) {
  const item = screen.getByText(conceptText).closest(".sb-history-item") as HTMLElement;
  const openBtn = item.querySelector(".sb-history-open") as HTMLElement;
  fireEvent.click(openBtn);
}

describe("AC1: App switchSession 통합", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("세션 선택 시 loadSession(targetId) 결과로 학습 상태(stage/concept)를 복원한다", async () => {
    persistSession(makeState("s-target", "재귀이론", { stage: "done" }));
    // 현재 활성 세션은 본문이 없어 input 단계로 시작한다(전환 대상과 구분).
    localStorage.setItem(ACTIVE_SESSION_KEY, "s-current");

    render(<App />);

    // 전환 전: 현재 세션은 input 단계
    expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("input");

    clickOpen("재귀이론");

    // loadSession(s-target) 의 stage(done) 로 복원되어 앱 컨테이너 data-stage 가 갱신된다
    await waitFor(() => {
      expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("done");
    });
    // 전환된 세션이 활성으로 표시된다(sessionIdRef.current 갱신 확인)
    const active = document.querySelector(".sb-history-item.is-active");
    expect(active?.textContent).toContain("재귀이론");
  });

  it("전환 시 현재 세션을 persistSession 으로 저장해 유실 없이 보존한다", async () => {
    // 활성 세션 s-source 의 본문을 미리 저장하고 그 세션으로 마운트한다.
    persistSession(makeState("s-source", "소스개념", { stage: "learn", estimatedLevel: 1 }));
    persistSession(makeState("s-target", "타깃개념", { stage: "done" }));
    localStorage.setItem(ACTIVE_SESSION_KEY, "s-source");

    render(<App />);

    // s-source -> s-target 전환
    clickOpen("타깃개념");
    await waitFor(() => {
      const active = document.querySelector(".sb-history-item.is-active");
      expect(active?.textContent).toContain("타깃개념");
    });

    // 전환 직전에 현재(s-source) 세션이 persist 되어 인덱스/본문에 그대로 남아있다.
    expect(listSessions().some((m) => m.sessionId === "s-source")).toBe(true);
    const saved = loadSession("s-source");
    expect(saved?.concept).toBe("소스개념");
    expect(saved?.stage).toBe("learn");

    // 다시 s-source 로 전환하면 보존된 학습 상태가 복원된다.
    clickOpen("소스개념");
    await waitFor(() => {
      const active = document.querySelector(".sb-history-item.is-active");
      expect(active?.textContent).toContain("소스개념");
    });
  });
});
