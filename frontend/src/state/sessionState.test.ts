import { describe, test, expect } from "vitest";
import {
  serializeSessionState,
  deserializeSessionState,
  type SessionState,
} from "./sessionState";

function fullState(): SessionState {
  return {
    sessionId: "s-123",
    createdAt: 1717000000000,
    conceptSummary: "코루틴이 왜 필요한지",
    stage: "learn",
    depth: "1depth",
    concept: "코루틴이 왜 필요한지",
    materials: "참고 자료 텍스트",
    probes: { p1: 2, p2: ["thread", "suspend"], p3: "비동기 처리" },
    estimatedLevel: 3,
    stepIdx: 2,
    answers: { "1-1": "동시성은 번갈아", "2-1": "약 1MB" },
    skips: { "3-1": true },
  };
}

describe("sessionState 직렬화/역직렬화", () => {
  test("전체 상태 round-trip 시 동일 객체로 복원된다", () => {
    const state = fullState();
    const restored = deserializeSessionState(serializeSessionState(state));
    expect(restored).toEqual(state);
  });

  test("직렬화 결과는 유효한 JSON 문자열이다", () => {
    const json = serializeSessionState(fullState());
    expect(typeof json).toBe("string");
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test("빈/초기 상태도 round-trip 보존된다", () => {
    const initial: SessionState = {
      sessionId: "s-0",
      createdAt: 0,
      conceptSummary: "",
      stage: "input",
      depth: "0depth",
      concept: "",
      materials: "",
      probes: {},
      estimatedLevel: null,
      stepIdx: 0,
      answers: {},
      skips: {},
    };
    expect(deserializeSessionState(serializeSessionState(initial))).toEqual(initial);
  });

  test("estimatedLevel null 값이 보존된다", () => {
    const state = { ...fullState(), estimatedLevel: null };
    const restored = deserializeSessionState(serializeSessionState(state));
    expect(restored.estimatedLevel).toBeNull();
  });

  test("알 수 없는 필드는 직렬화에서 제외된다", () => {
    const dirty = { ...fullState(), secret: "drop-me" } as unknown as SessionState;
    const json = serializeSessionState(dirty);
    expect(JSON.parse(json)).not.toHaveProperty("secret");
  });

  test("객체가 아닌 JSON 역직렬화 시 throw 한다", () => {
    expect(() => deserializeSessionState("null")).toThrow();
    expect(() => deserializeSessionState("42")).toThrow();
  });

  test("잘못된 JSON 문법은 throw 한다", () => {
    expect(() => deserializeSessionState("{not json")).toThrow();
  });

  test("알 수 없는 stage 는 input 으로 보정된다", () => {
    const json = JSON.stringify({ ...fullState(), stage: "bogus" });
    expect(deserializeSessionState(json).stage).toBe("input");
  });

  test("정상 fieldUpdatedAt(Record<string,string>) 가 round-trip 보존된다", () => {
    const fieldUpdatedAt = {
      stepIdx: "2024-01-01T00:00:00.000Z",
      answers: "2024-01-02T03:04:05.678Z",
      skips: "2024-01-03T12:30:00.000Z",
      stage: "2024-01-04T09:15:30.000Z",
    };
    const state: SessionState = { ...fullState(), fieldUpdatedAt };
    const restored = deserializeSessionState(serializeSessionState(state));
    expect(restored.fieldUpdatedAt).toEqual(fieldUpdatedAt);
    expect(restored).toEqual(state);
  });
});
