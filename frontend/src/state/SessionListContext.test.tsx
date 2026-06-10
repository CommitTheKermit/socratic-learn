/**
 * SessionListContext (seed_474069bdeb92) AC 검증.
 *
 * AC1: 단계 전환(자식 재마운트) 시 Provider가 재마운트되지 않아 sessions가 undefined로 초기화되지 않음
 * AC2: user 로그인 시 fetchRemoteSessionList가 1회 호출되어 sessions가 SessionMeta[]로 채워짐
 * AC3: fetchRemoteSessionList 실패(reject) 후 sessions === []이고 undefined로 남지 않음
 * AC4: upsertSession - stage가 input이 아니면 createdAt 내림차순 반영, input이면 무변화
 * AC5: removeSession - 목록 제거 + tombstone + 본문 캐시 제거 + deleteSessionRemote, 원격 reject에도 제거 유지
 *
 * useAuth 는 vitest.setup.ts 가 전역 mock(항상 로그인된 더미 user)한다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { SessionListProvider, useSessionList, type SessionListValue } from "./SessionListContext";
import type { SessionState } from "./sessionState";

// 원격 API stub. fetchRemoteSessionList(sessionSync)는 내부에서 listSessionsRemote를 호출한다.
vi.mock("../api/sessionApi", () => ({
  listSessionsRemote: vi.fn(async () => []),
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  getSessionRemote: vi.fn(async () => null),
}));

import { listSessionsRemote, deleteSessionRemote } from "../api/sessionApi";
import { sessionKey } from "./sessionPersist";
import { listTombstones } from "./sessionTombstone";

function makeState(over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: "s1",
    createdAt: 100,
    conceptSummary: "개념1",
    stage: "probe",
    mode: "0depth",
    concept: "개념1",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...over,
  };
}

// consumer: 현재 api 를 모듈 변수로 노출하고 sessions 를 렌더한다.
let api: SessionListValue | null = null;
function Consumer() {
  api = useSessionList();
  const s = api.sessions;
  return (
    <div>
      <div data-testid="count">{s === undefined ? "undef" : String(s.length)}</div>
      <div data-testid="ids">{(s ?? []).map((m) => m.sessionId).join(",")}</div>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api = null;
});

describe("SessionListContext", () => {
  test("AC2: user 로그인 시 fetchRemoteSessionList 1회 호출 → sessions 채워짐", async () => {
    vi.mocked(listSessionsRemote).mockResolvedValue([
      { sessionId: "r1", conceptSummary: "원격1", stage: "learn", updatedAt: 10 },
    ]);

    render(
      <SessionListProvider>
        <Consumer />
      </SessionListProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("ids").textContent).toBe("r1"));
    expect(listSessionsRemote).toHaveBeenCalledTimes(1);
  });

  test("AC3: fetchRemoteSessionList 실패(reject) 후 sessions === []", async () => {
    vi.mocked(listSessionsRemote).mockRejectedValue(new Error("network"));

    render(
      <SessionListProvider>
        <Consumer />
      </SessionListProvider>,
    );

    // fetchRemoteSessionList 가 실패 시 [] 반환 → sessions 가 [] 로 확정(undefined 유지 아님)
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("0"));
  });

  test("AC1: 자식(라우트 역할)이 재마운트되어도 Provider sessions 보존 + fetch 재호출 없음", async () => {
    vi.mocked(listSessionsRemote).mockResolvedValue([
      { sessionId: "keep", conceptSummary: "유지", stage: "done", updatedAt: 7 },
    ]);

    // childKey 변경 = 단계 전환으로 라우트 자식(AppShell 역할)이 재마운트되는 상황을 모델링한다.
    function Wrapper({ childKey }: { childKey: string }) {
      return (
        <SessionListProvider>
          <div key={childKey}>
            <Consumer />
          </div>
        </SessionListProvider>
      );
    }

    const { rerender } = render(<Wrapper childKey="probe" />);
    await waitFor(() => expect(screen.getByTestId("ids").textContent).toBe("keep"));
    expect(listSessionsRemote).toHaveBeenCalledTimes(1);

    // 자식 재마운트(단계 전환). Provider 는 같은 위치라 유지되어야 한다.
    rerender(<Wrapper childKey="learn" />);

    // sessions 가 undefined 로 초기화되지 않고 유지됨 + fetch 가 재호출되지 않음
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("ids").textContent).toBe("keep");
    expect(listSessionsRemote).toHaveBeenCalledTimes(1);
  });

  test("AC4: upsertSession - input 외 단계는 createdAt 내림차순 반영, input 은 무변화", async () => {
    vi.mocked(listSessionsRemote).mockResolvedValue([]);

    render(
      <SessionListProvider>
        <Consumer />
      </SessionListProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("0"));

    // createdAt 오름차순으로 넣어도 내림차순으로 정렬되어야 한다.
    act(() => api!.upsertSession(makeState({ sessionId: "a", createdAt: 100, stage: "probe" })));
    act(() => api!.upsertSession(makeState({ sessionId: "b", createdAt: 200, stage: "learn" })));
    await waitFor(() => expect(screen.getByTestId("ids").textContent).toBe("b,a"));

    // input 단계는 목록에 반영하지 않는다.
    act(() => api!.upsertSession(makeState({ sessionId: "c", createdAt: 300, stage: "input" })));
    expect(screen.getByTestId("ids").textContent).toBe("b,a");

    // 같은 sessionId 재upsert 는 갱신(개수 불변).
    act(() => api!.upsertSession(makeState({ sessionId: "a", createdAt: 100, stage: "done" })));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("ids").textContent).toBe("b,a");
  });

  test("AC5: removeSession - 목록 제거 + tombstone + 본문캐시 제거 + 원격삭제, reject에도 제거 유지", async () => {
    vi.mocked(listSessionsRemote).mockResolvedValue([
      { sessionId: "x", conceptSummary: "엑스", stage: "learn", updatedAt: 10 },
    ]);
    vi.mocked(deleteSessionRemote).mockRejectedValue(new Error("500"));
    localStorage.setItem(sessionKey("x"), JSON.stringify(makeState({ sessionId: "x" })));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <SessionListProvider>
        <Consumer />
      </SessionListProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("ids").textContent).toBe("x"));

    act(() => api!.removeSession("x"));

    // 목록에서 즉시 제거
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("0"));
    // tombstone 기록
    expect(listTombstones().has("x")).toBe(true);
    // 본문 캐시 제거
    expect(localStorage.getItem(sessionKey("x"))).toBeNull();
    // 원격 삭제 호출
    expect(deleteSessionRemote).toHaveBeenCalledWith("x");
    // 원격 reject 후에도 목록에서 제거 유지(롤백 없음) + console.error 1회
    await waitFor(() => expect(errSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
});
