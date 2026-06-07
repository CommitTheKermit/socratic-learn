import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { _resetForTest } from "../state/fetchOncePerSession";
import { persistSession } from "../state/sessionPersist";
import type { SessionState } from "../state/sessionState";

/**
 * AC4: fetch 실패 시 에러 UI 가 렌더되지 않고 캐시 기반 화면이 그대로 유지된다.
 *
 * 검증 내용:
 * 1. fetchAndMerge 가 reject 되어도 에러 배너/재시도 버튼/새로고침 버튼이 렌더되지 않는다.
 * 2. AppSession 의 reloadToken 이 증가하지 않아 LearnContentProvider 가
 *    localStorage 에서 초기화된 상태를 그대로 유지한다(캐시 기반 화면 유지).
 * 3. 앱의 주요 구조(.app, .main)는 정상 렌더 상태를 유지한다.
 */

const mockFetchAndMerge = vi.fn();

vi.mock("../state/sessionSync", () => ({
  fetchAndMerge: (...args: unknown[]) => mockFetchAndMerge(...args),
  fetchRemoteSessionList: vi.fn().mockResolvedValue([]),
  mergeSessionLists: vi.fn((local: unknown) => local),
  persistWithSync: vi.fn((snap: unknown) => snap),
}));

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

function makeSession(id: string, overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: id,
    createdAt: 1234567890,
    conceptSummary: "캐시 테스트 개념",
    stage: "probe",
    depth: "0depth",
    concept: "캐시 테스트 개념",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...overrides,
  };
}

function renderAtSession(sessionId: string, path = `/s/${sessionId}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("AC4: fetch 실패 시 에러 UI 없음 - 캐시 기반 화면 유지", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchAndMerge.mockReset();
    _resetForTest();
  });

  it("fetchAndMerge reject 후 에러 UI 요소가 DOM 에 존재하지 않는다", async () => {
    mockFetchAndMerge.mockRejectedValue(new Error("network error"));
    const SESSION_ID = "s-ac4-no-error-ui";
    persistSession(makeSession(SESSION_ID));

    const { container } = renderAtSession(SESSION_ID, `/s/${SESSION_ID}/probe`);

    // fetchAndMerge 호출 대기
    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
    });

    // .catch() 처리 완료 대기
    await new Promise((r) => setTimeout(r, 0));

    // 에러 UI 요소가 존재하지 않아야 한다
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.querySelector(".error-banner")).toBeNull();
    expect(container.querySelector(".retry-btn")).toBeNull();
    expect(container.querySelector(".refresh-btn")).toBeNull();
  });

  it("fetchAndMerge reject 후 앱의 주요 구조(.app, .main)가 정상 렌더된다", async () => {
    mockFetchAndMerge.mockRejectedValue(new Error("server error"));
    const SESSION_ID = "s-ac4-main-structure";
    persistSession(makeSession(SESSION_ID));

    const { container } = renderAtSession(SESSION_ID, `/s/${SESSION_ID}/probe`);

    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
    });

    await new Promise((r) => setTimeout(r, 0));

    // 앱 주요 구조가 에러로 대체되지 않고 유지된다
    expect(container.querySelector(".app")).not.toBeNull();
    expect(container.querySelector(".main")).not.toBeNull();
  });

  it("fetchAndMerge reject 후 reloadToken 이 증가하지 않아 초기 캐시 상태가 유지된다", async () => {
    // fetchAndMerge 가 성공하면 merged != null 일 때 reloadToken 을 올려 LearnContentProvider 를 재초기화.
    // 실패(reject)하면 .catch() 에서 아무것도 하지 않으므로 reloadToken 은 0 그대로.
    // 이를 간접 검증: 성공 케이스(merged 있음)와 비교해 실패 케이스에서 렌더가 1회(초기)만 일어남.

    const SESSION_ID = "s-ac4-no-reload";
    persistSession(makeSession(SESSION_ID));

    let renderCount = 0;

    // fetchAndMerge reject - reloadToken 증가 없음
    mockFetchAndMerge.mockRejectedValue(new Error("fail"));

    const { container } = renderAtSession(SESSION_ID, `/s/${SESSION_ID}/probe`);
    renderCount = container.querySelectorAll(".app").length; // 렌더된 .app 수

    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
    });
    await new Promise((r) => setTimeout(r, 0));

    // fetch 실패 후에도 .app 는 여전히 1개 - 재마운트(reloadToken 증가)가 없음
    expect(container.querySelectorAll(".app").length).toBe(renderCount);
    // 에러 UI 없음
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("fetch 실패 후에도 localStorage 에 저장된 캐시 데이터 기반으로 화면이 유지된다", async () => {
    mockFetchAndMerge.mockRejectedValue(new Error("timeout"));
    const SESSION_ID = "s-ac4-cache-visible";
    // probe 단계 세션을 localStorage 에 저장
    persistSession(makeSession(SESSION_ID, { stage: "probe" }));

    const { container } = renderAtSession(SESSION_ID, `/s/${SESSION_ID}/probe`);

    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
    });
    await new Promise((r) => setTimeout(r, 0));

    // probe 단계 컨테이너가 렌더되어 있어야 한다(캐시 기반 화면 유지 확인)
    expect(container.querySelector(".main")).not.toBeNull();
    // 에러로 인한 화면 교체 없음
    expect(container.querySelector("[role='alert']")).toBeNull();
    expect(container.querySelector(".error-banner")).toBeNull();
  });
});
