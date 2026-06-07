import { describe, test, expect, beforeEach, vi } from "vitest";

// sessionApi(네트워크 계층)를 mock 해 동기화 트리거/병합만 검증한다.
const saveSessionRemote = vi.fn<(s: unknown) => Promise<void>>();
const getSessionRemote = vi.fn<(id: string) => Promise<unknown>>();
const listSessionsRemote = vi.fn<() => Promise<unknown>>();
vi.mock("../api/sessionApi", () => ({
  saveSessionRemote: (s: unknown) => saveSessionRemote(s),
  getSessionRemote: (id: string) => getSessionRemote(id),
  listSessionsRemote: () => listSessionsRemote(),
}));

import {
  fetchAndMerge,
  fetchRemoteSessionList,
  mergeSessionLists,
  persistWithSync,
} from "./sessionSync";
import { loadSession, persistSession } from "./sessionPersist";
import type { SessionState } from "./sessionState";
import type { SessionMeta } from "./sessionIndex";
import type { SessionIndexEntry } from "../api/contract";

function createStorageMock(): Storage & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    get length() {
      return store.size;
    },
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
}

function baseState(over: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: "s-1",
    createdAt: 1717000000000,
    conceptSummary: "코루틴",
    stage: "learn",
    depth: "0depth",
    concept: "코루틴",
    materials: "",
    probes: {},
    estimatedLevel: 2,
    stepIdx: 0,
    answers: {},
    skips: {},
    ...over,
  };
}

describe("persistWithSync", () => {
  let storage: ReturnType<typeof createStorageMock>;
  beforeEach(() => {
    storage = createStorageMock();
    saveSessionRemote.mockReset();
    saveSessionRemote.mockResolvedValue(undefined);
  });

  test("첫 저장: 캐시에 기록하고 원격 저장을 던진다", () => {
    const out = persistWithSync(baseState(), storage);
    expect(loadSession("s-1", storage)).not.toBeNull();
    expect(saveSessionRemote).toHaveBeenCalledTimes(1);
    // 정의된 필드는 모두 스탬핑된다(materials 도 ""로 정의됨).
    expect(out.fieldUpdatedAt?.concept).toBeTruthy();
    expect(out.fieldUpdatedAt?.answers).toBeTruthy();
  });

  test("변경 없는 재저장: 원격 저장을 던지지 않는다", () => {
    persistWithSync(baseState(), storage);
    saveSessionRemote.mockClear();
    persistWithSync(baseState(), storage); // 동일 내용
    expect(saveSessionRemote).not.toHaveBeenCalled();
  });

  test("변경된 필드만 새 타임스탬프로 갱신한다", () => {
    const first = persistWithSync(baseState({ stepIdx: 0 }), storage);
    const tsConceptBefore = first.fieldUpdatedAt?.concept;
    const second = persistWithSync(baseState({ stepIdx: 3 }), storage);
    // stepIdx 만 바뀌었으므로 concept 스탬프는 보존, stepIdx 스탬프는 갱신
    expect(second.fieldUpdatedAt?.concept).toBe(tsConceptBefore);
    expect(saveSessionRemote).toHaveBeenCalledTimes(2);
  });

  test("remote=false 면 원격 저장을 던지지 않는다(input 초안)", () => {
    persistWithSync(baseState({ stage: "input" }), storage, { index: false });
    expect(saveSessionRemote).not.toHaveBeenCalled();
  });
});

describe("fetchAndMerge", () => {
  let storage: ReturnType<typeof createStorageMock>;
  beforeEach(() => {
    storage = createStorageMock();
    getSessionRemote.mockReset();
  });

  test("원격에 없으면 null", async () => {
    getSessionRemote.mockResolvedValue(null);
    expect(await fetchAndMerge("s-1", storage)).toBeNull();
  });

  test("캐시 없으면 원격을 채택해 캐시에 채운다", async () => {
    const remote = baseState({ stepIdx: 5, fieldUpdatedAt: { stepIdx: "2020-01-01T00:00:00.000Z" } });
    getSessionRemote.mockResolvedValue(remote);
    const merged = await fetchAndMerge("s-1", storage);
    expect(merged?.stepIdx).toBe(5);
    expect(loadSession("s-1", storage)?.stepIdx).toBe(5);
  });

  test("병합 결과가 캐시와 같으면 null(리마운트 불필요)", async () => {
    persistWithSync(baseState({ stepIdx: 7 }), storage);
    const remote = loadSession("s-1", storage)!; // 동일 본문을 원격이 갖고 있다고 가정
    getSessionRemote.mockResolvedValue(remote);
    expect(await fetchAndMerge("s-1", storage)).toBeNull();
  });

  test("동률(타임스탬프 동일)이면 서버(원격) 값을 채택한다", async () => {
    const ts = "2024-01-01T00:00:00.000Z";
    // 캐시 스탬프를 고정하려 persistSession 으로 직접 기록한다(persistWithSync 는 stamp 를 재계산함).
    persistSession(baseState({ stepIdx: 1, fieldUpdatedAt: { stepIdx: ts } }), storage);
    const remote = baseState({ stepIdx: 99, fieldUpdatedAt: { stepIdx: ts } });
    getSessionRemote.mockResolvedValue(remote);
    const merged = await fetchAndMerge("s-1", storage);
    expect(merged?.stepIdx).toBe(99);
  });
});

describe("mergeSessionLists", () => {
  const meta = (id: string, createdAt: number): SessionMeta => ({
    sessionId: id,
    createdAt,
    conceptSummary: id,
    stage: "learn",
  });
  const entry = (id: string, updatedAt: number): SessionIndexEntry => ({
    sessionId: id,
    conceptSummary: id,
    stage: "learn",
    updatedAt,
  });

  test("로컬 메타는 유지하고 원격 전용만 추가한다", () => {
    const out = mergeSessionLists([meta("a", 100)], [entry("a", 999), entry("b", 50)]);
    expect(out.map((m) => m.sessionId)).toEqual(["a", "b"]);
    // 로컬 a 의 createdAt(100)은 원격 updatedAt(999)로 덮이지 않는다.
    expect(out.find((m) => m.sessionId === "a")?.createdAt).toBe(100);
  });

  test("createdAt 내림차순 정렬", () => {
    const out = mergeSessionLists([meta("a", 10)], [entry("b", 30), entry("c", 20)]);
    expect(out.map((m) => m.sessionId)).toEqual(["b", "c", "a"]);
  });

  // AC 5b: 삭제 성공 후 mergeSessionLists 재실행해도 삭제 세션 미포함
  describe("AC5b: 원격 삭제 성공 후 mergeSessionLists 재실행 시 삭제 세션 미포함", () => {
    test("원격에서도 제거된 세션은 mergeSessionLists 결과에 포함되지 않는다", () => {
      // 삭제 전: 로컬 [a, b, c], 원격 [a, b, c]
      const localBefore = [meta("a", 300), meta("b", 200), meta("c", 100)];
      const remoteBefore = [entry("a", 300), entry("b", 200), entry("c", 100)];
      const before = mergeSessionLists(localBefore, remoteBefore);
      expect(before.map((m) => m.sessionId)).toContain("b");

      // 원격 삭제 성공 후: 로컬 [a, c], 원격 [a, c] (양쪽에서 b 제거)
      const localAfter = [meta("a", 300), meta("c", 100)];
      const remoteAfter = [entry("a", 300), entry("c", 100)];
      const after = mergeSessionLists(localAfter, remoteAfter);

      expect(after.map((m) => m.sessionId)).not.toContain("b");
      expect(after.map((m) => m.sessionId)).toEqual(["a", "c"]);
    });

    test("로컬만 삭제하고 원격에 세션이 남아 있으면 mergeSessionLists가 되살린다(구 문제 재현)", () => {
      // 로컬에서만 b 제거, 원격은 b 보유 -> mergeSessionLists 가 b 재추가(구 문제)
      const localOnlyDeleted = [meta("a", 300), meta("c", 100)];
      const remoteStillHasB = [entry("a", 300), entry("b", 200), entry("c", 100)];
      const result = mergeSessionLists(localOnlyDeleted, remoteStillHasB);

      // 원격 전용 항목으로 b 가 추가됨 - 이것이 /sessionDelete 없이 로컬만 지울 때의 문제
      expect(result.map((m) => m.sessionId)).toContain("b");
    });

    test("원격 삭제 성공 후 재실행: 남은 세션의 순서/값은 보존된다", () => {
      // a(300), b(200), c(100), d(50) 중 b 삭제
      const localAfter = [meta("a", 300), meta("c", 100), meta("d", 50)];
      const remoteAfter = [entry("a", 300), entry("c", 100), entry("d", 50)];
      const result = mergeSessionLists(localAfter, remoteAfter);

      expect(result.map((m) => m.sessionId)).toEqual(["a", "c", "d"]);
      // 로컬 메타 값(createdAt) 보존
      expect(result.find((m) => m.sessionId === "a")?.createdAt).toBe(300);
      expect(result.find((m) => m.sessionId === "c")?.createdAt).toBe(100);
    });

    test("삭제된 세션이 원격에서 유일한 항목이어도 빈 목록을 올바르게 반환한다", () => {
      // 마지막 세션을 삭제
      const localAfter: SessionMeta[] = [];
      const remoteAfter: SessionIndexEntry[] = [];
      const result = mergeSessionLists(localAfter, remoteAfter);

      expect(result).toEqual([]);
    });
  });
});

describe("fetchRemoteSessionList", () => {
  test("실패 시 빈 배열", async () => {
    listSessionsRemote.mockRejectedValue(new Error("net"));
    expect(await fetchRemoteSessionList()).toEqual([]);
  });
});
