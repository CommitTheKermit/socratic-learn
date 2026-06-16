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
    mode: "1depth",
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
    // fieldUpdatedAt 누락 입력은 빈 객체로 정규화된다(나머지 필드는 동일하게 보존).
    expect(restored).toEqual({ ...state, fieldUpdatedAt: {} });
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
      mode: "0depth",
      concept: "",
      materials: "",
      probes: {},
      estimatedLevel: null,
      stepIdx: 0,
      answers: {},
      skips: {},
    };
    expect(deserializeSessionState(serializeSessionState(initial))).toEqual({
      ...initial,
      fieldUpdatedAt: {},
    });
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

  test("stepBranches/branchedStepIds 분기 스냅샷이 round-trip 보존된다", () => {
    const state: SessionState = {
      ...fullState(),
      stepBranches: {
        0: {
          evaluationText: "잘 이해했어요",
          isMerged: false,
          options: [
            { label: "다음 로드맵", type: "roadmap_next", isRecommended: true, stageContent: null },
            { label: "추가 학습", type: "additional", isRecommended: false, stageContent: null },
          ],
        },
      },
      branchedStepIds: [1, 3],
    };
    const restored = deserializeSessionState(serializeSessionState(state));
    expect(restored.stepBranches).toEqual(state.stepBranches);
    expect(restored.branchedStepIds).toEqual([1, 3]);
  });

  test("options 가 빈 분기 스냅샷(에러/전이 잔여)은 역직렬화에서 버려진다", () => {
    const json = JSON.stringify({
      ...fullState(),
      stepBranches: { 0: { evaluationText: "x", isMerged: false, options: [] } },
    });
    expect(deserializeSessionState(json).stepBranches).toBeUndefined();
  });

  test("branchedStepIds 의 정수 아닌 항목은 걸러진다", () => {
    const json = JSON.stringify({ ...fullState(), branchedStepIds: [1, "2", 3.5, 4] });
    expect(deserializeSessionState(json).branchedStepIds).toEqual([1, 4]);
  });

  test("분기 스냅샷이 없으면 직렬화 결과에 키가 포함되지 않는다", () => {
    const json = serializeSessionState(fullState());
    const parsed = JSON.parse(json);
    expect(parsed).not.toHaveProperty("stepBranches");
    expect(parsed).not.toHaveProperty("branchedStepIds");
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

describe("deserializeSessionState - fieldUpdatedAt 누락/손상 보정", () => {
  test("fieldUpdatedAt 키가 아예 없으면 빈 객체로 보정한다", () => {
    const json = JSON.stringify({ ...fullState() }); // fieldUpdatedAt 미포함
    const restored = deserializeSessionState(json);
    expect(restored.fieldUpdatedAt).toEqual({});
  });

  test("fieldUpdatedAt 가 undefined(직렬화 시 생략)여도 빈 객체로 보정한다", () => {
    const state: SessionState = { ...fullState(), fieldUpdatedAt: undefined };
    const restored = deserializeSessionState(serializeSessionState(state));
    expect(restored.fieldUpdatedAt).toEqual({});
  });

  test("fieldUpdatedAt 가 null 이면 빈 객체로 보정한다", () => {
    const json = JSON.stringify({ ...fullState(), fieldUpdatedAt: null });
    const restored = deserializeSessionState(json);
    expect(restored.fieldUpdatedAt).toEqual({});
  });

  test("fieldUpdatedAt 가 빈 객체로 직렬화된 입력은 빈 객체로 복원된다", () => {
    const json = JSON.stringify({ ...fullState(), fieldUpdatedAt: {} });
    const restored = deserializeSessionState(json);
    expect(restored.fieldUpdatedAt).toEqual({});
  });

  test("fieldUpdatedAt 가 비객체(문자열/숫자/불리언) 손상 입력이면 빈 객체로 보정한다", () => {
    for (const corrupt of ["not-an-object", 42, true]) {
      const json = JSON.stringify({ ...fullState(), fieldUpdatedAt: corrupt });
      const restored = deserializeSessionState(json);
      expect(restored.fieldUpdatedAt).toEqual({});
    }
  });

  test("fieldUpdatedAt 가 배열(잘못된 타입)이면 빈 객체로 보정한다", () => {
    const json = JSON.stringify({
      ...fullState(),
      fieldUpdatedAt: ["2024-01-01T00:00:00.000Z"],
    });
    const restored = deserializeSessionState(json);
    expect(restored.fieldUpdatedAt).toEqual({});
  });

  test("fieldUpdatedAt 의 값 중 문자열이 아닌 항목은 버리고 문자열만 보존한다", () => {
    const json = JSON.stringify({
      ...fullState(),
      fieldUpdatedAt: {
        stage: "2024-01-04T09:15:30.000Z", // 유효
        stepIdx: 12345, // 비문자열 → 버림
        answers: null, // 비문자열 → 버림
        concept: { nested: true }, // 비문자열 → 버림
      },
    });
    const restored = deserializeSessionState(json);
    expect(restored.fieldUpdatedAt).toEqual({ stage: "2024-01-04T09:15:30.000Z" });
  });

  test("모든 값이 손상되면 빈 객체가 되며 deserialize 는 throw 하지 않는다", () => {
    const json = JSON.stringify({
      ...fullState(),
      fieldUpdatedAt: { a: 1, b: false, c: null },
    });
    expect(() => deserializeSessionState(json)).not.toThrow();
    expect(deserializeSessionState(json).fieldUpdatedAt).toEqual({});
  });
});
