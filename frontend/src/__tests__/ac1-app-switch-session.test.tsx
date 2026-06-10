import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

// 사이드바 목록의 진실 출처는 원격(listSessionsRemote)이므로 각 테스트에서 mockResolvedValue 로 채운다.
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

import App from "../App";
import { persistSession, loadSession } from "../state/sessionPersist";
import { listSessionsRemote } from "../api/sessionApi";
import type { SessionState } from "../state/sessionState";
import type { SessionIndexEntry } from "../api/contract";

const ACTIVE_SESSION_KEY = "socratic:activeSessionId";

function makeState(id: string, concept: string, over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: id,
    createdAt: 4242,
    conceptSummary: concept,
    stage: "done",
    mode: "intermediate",
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

/** 원격 목록 mock 을 채운다(사이드바에 세션이 나타나게 한다). */
function seedRemoteList(entries: SessionIndexEntry[]) {
  vi.mocked(listSessionsRemote).mockResolvedValue(entries);
}

function clickOpen(conceptText: string) {
  const item = screen.getByText(conceptText).closest(".sb-history-item") as HTMLElement;
  const openBtn = item.querySelector(".sb-history-open") as HTMLElement;
  fireEvent.click(openBtn);
}

function renderApp(entries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

describe("AC1: App switchSession 통합", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("사이드바에서 세션 선택 시 loadSession(targetId) 결과로 학습 상태(stage/concept)를 복원한다", async () => {
    persistSession(makeState("s-target", "재귀이론", { stage: "done" }));
    // 활성 세션 키는 본문이 없는 id 라 루트 진입 시 홈(input)으로 시작한다(전환 대상과 구분).
    localStorage.setItem(ACTIVE_SESSION_KEY, "s-current");
    seedRemoteList([{ sessionId: "s-target", conceptSummary: "재귀이론", stage: "done", updatedAt: 4242 }]);

    renderApp(["/"]);

    // 전환 전: 본문 없는 활성 세션이므로 홈(input) 화면
    expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("input");

    // 사이드바에 전환 대상(원격)이 나타날 때까지 대기
    await waitFor(() => expect(screen.getByText("재귀이론")).toBeInTheDocument());
    clickOpen("재귀이론");

    // loadSession(s-target) 의 stage(done) 로 복원되어 앱 컨테이너 data-stage 가 갱신된다
    await waitFor(() => {
      expect(document.querySelector(".app")?.getAttribute("data-stage")).toBe("done");
    });
    // 전환된 세션이 활성으로 표시된다(URL 의 sessionId 갱신 확인)
    const active = document.querySelector(".sb-history-item.is-active");
    expect(active?.textContent).toContain("재귀이론");
  });

  it("전환 후에도 떠난 세션이 persist 된 상태로 보존되어 다시 이어갈 수 있다", async () => {
    persistSession(makeState("s-source", "소스개념", { stage: "learn", estimatedLevel: 1 }));
    persistSession(makeState("s-target", "타깃개념", { stage: "done" }));
    localStorage.setItem(ACTIVE_SESSION_KEY, "s-source");
    seedRemoteList([
      { sessionId: "s-source", conceptSummary: "소스개념", stage: "learn", updatedAt: 4242 },
      { sessionId: "s-target", conceptSummary: "타깃개념", stage: "done", updatedAt: 4242 },
    ]);

    // s-source(learn, stepIdx 3) 세션 URL 로 직접 진입한다(루트 자동 복원은 더 이상 없다).
    renderApp(["/s/s-source/learn/3"]);
    await waitFor(() => {
      const active = document.querySelector(".sb-history-item.is-active");
      expect(active?.textContent).toContain("소스개념");
    });

    // s-source -> s-target 전환
    clickOpen("타깃개념");
    await waitFor(() => {
      const active = document.querySelector(".sb-history-item.is-active");
      expect(active?.textContent).toContain("타깃개념");
    });

    // 떠난 s-source 세션이 본문 캐시에 그대로 보존되어 있다.
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
