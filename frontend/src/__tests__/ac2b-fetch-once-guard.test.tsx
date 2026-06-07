import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * Sub-AC 2: 성공/실패 분기 기록
 *
 * fetchOncePerSession 모듈이 fetch 성공 시에만 완료로 기록하고
 * 실패 시 미완료 상태를 유지해 같은 sessionId 로 재시도 가능함을 검증한다.
 *
 * App.tsx 의 AppSession useEffect 는:
 * 1. hasSynced(sessionId) 가 true 이면 fetchAndMerge 를 호출하지 않는다.
 * 2. hasSynced 가 false 이면 fetchAndMerge 를 1회 호출한다.
 * 3. fetchAndMerge 성공 시 markSynced(sessionId) 를 호출한다.
 * 4. fetchAndMerge 실패 시 markSynced 를 호출하지 않아 다음 진입에 재시도 가능하다.
 */

// vi.mock 팩토리는 호이스팅되므로, 팩토리 안에서 사용할 spy는 vi.hoisted()로 미리 생성한다.
const { mockFetchAndMerge, mockHasSynced, mockMarkSynced } = vi.hoisted(() => ({
  mockFetchAndMerge: vi.fn<[string], Promise<unknown>>(),
  mockHasSynced: vi.fn<[string], boolean>(),
  mockMarkSynced: vi.fn<[string], void>(),
}));

// App.tsx 가 import 하는 sessionSync 의 fetchAndMerge 를 spy 로 교체
vi.mock("../state/sessionSync", () => ({
  fetchAndMerge: (id: string) => mockFetchAndMerge(id),
  fetchRemoteSessionList: vi.fn(async () => []),
  mergeSessionLists: vi.fn((local: unknown[]) => local),
  persistWithSync: vi.fn(),
}));

// App.tsx 가 import 하는 fetchOncePerSession 의 hasSynced/markSynced 를 spy 로 교체
vi.mock("../state/fetchOncePerSession", () => ({
  hasSynced: (id: string) => mockHasSynced(id),
  markSynced: (id: string) => mockMarkSynced(id),
  _resetForTest: vi.fn(),
}));

// Claude 콘텐츠 로딩 stub (네트워크 격리)
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
import { persistSession } from "../state/sessionPersist";
import type { SessionState } from "../state/sessionState";

function makeSession(id: string, overrides: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: id,
    createdAt: 1234567890,
    conceptSummary: "테스트 개념",
    stage: "probe",
    depth: "0depth",
    concept: "테스트 개념",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...overrides,
  };
}

function renderAtSession(sessionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/s/${sessionId}/probe`]}>
      <App />
    </MemoryRouter>,
  );
}

describe("Sub-AC 2: fetchOncePerSession 성공/실패 분기 기록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // 기본: 완료되지 않은 상태, fetchAndMerge 성공(null=캐시와 동일)
    mockFetchAndMerge.mockResolvedValue(null);
    mockHasSynced.mockReturnValue(false);
  });

  it("hasSynced 가 true 이면 fetchAndMerge 를 호출하지 않는다", async () => {
    const SESSION_ID = "s-already-synced";

    // 세션을 localStorage 에 저장해 렌더가 가능하게 한다
    persistSession(makeSession(SESSION_ID));

    // hasSynced 가 이 sessionId 에 대해 true 를 반환하도록 설정
    mockHasSynced.mockImplementation((id) => id === SESSION_ID);

    renderAtSession(SESSION_ID);

    // 비동기 useEffect 가 실행되고 가드를 통과했음을 확인하기 위해 짧게 기다린다.
    // hasSynced 가 true 이므로 fetchAndMerge 는 0회여야 한다.
    await new Promise((r) => setTimeout(r, 50));

    // hasSynced 가 해당 sessionId 로 호출됐어야 한다(가드 체크)
    expect(mockHasSynced).toHaveBeenCalledWith(SESSION_ID);
    // fetchAndMerge 는 단 한 번도 호출되지 않았어야 한다
    expect(mockFetchAndMerge).toHaveBeenCalledTimes(0);
  });

  it("hasSynced 가 false 이면 fetchAndMerge 를 1회 호출한다", async () => {
    const SESSION_ID = "s-not-yet-synced";

    persistSession(makeSession(SESSION_ID));

    // hasSynced 가 false -> fetchAndMerge 호출 허용
    mockHasSynced.mockReturnValue(false);

    renderAtSession(SESSION_ID);

    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledTimes(1);
    });

    expect(mockFetchAndMerge).toHaveBeenCalledWith(SESSION_ID);
  });

  it("fetchAndMerge 성공 시 markSynced 가 sessionId 와 함께 호출된다(완료로 기록)", async () => {
    const SESSION_ID = "s-mark-on-success";

    persistSession(makeSession(SESSION_ID));

    mockHasSynced.mockReturnValue(false);
    mockFetchAndMerge.mockResolvedValue(null);

    renderAtSession(SESSION_ID);

    await waitFor(() => {
      expect(mockMarkSynced).toHaveBeenCalledWith(SESSION_ID);
    });
  });

  it("fetchAndMerge 실패 시 markSynced 가 호출되지 않아 다음 진입에 재시도 가능하다", async () => {
    const SESSION_ID = "s-retry-on-fail";

    persistSession(makeSession(SESSION_ID));

    mockHasSynced.mockReturnValue(false);
    mockFetchAndMerge.mockRejectedValue(new Error("network error"));

    renderAtSession(SESSION_ID);

    // fetchAndMerge 가 호출될 때까지 기다린다
    await waitFor(() => {
      expect(mockFetchAndMerge).toHaveBeenCalledTimes(1);
    });

    // 추가로 짧게 기다려 .catch 처리가 완료될 시간을 준다
    await new Promise((r) => setTimeout(r, 50));

    // 실패했으므로 markSynced 는 0회 - 다음 진입 시 hasSynced 가 여전히 false 를 반환해 재시도됨
    expect(mockMarkSynced).toHaveBeenCalledTimes(0);
  });
});
