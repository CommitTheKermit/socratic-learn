import { describe, test, expect } from "vitest";
import { resolveStepContext } from "./stepContext";
import type { Step } from "../stages/data";

// 헬퍼: 원본(비삽입) 단계 생성
function mainStep(id: number): Step {
  return { id, title: `Main ${id}`, desc: "", body: "", questions: [] };
}

// 헬퍼: 삽입(분기) 단계 생성 (siblingIndex는 0-based)
function branchStep(id: number, parentMainStepId: number, siblingIndex: number): Step {
  return {
    id,
    title: `Branch ${id}`,
    desc: "",
    body: "",
    questions: [],
    _meta: { parentMainStepId, siblingIndex },
  };
}

describe("resolveStepContext - 메인 스텝", () => {
  test("단일 메인 스텝이면 branchLabel === null", () => {
    const steps = [mainStep(1)];
    const ctx = resolveStepContext(steps, 0);
    expect(ctx.branchLabel).toBe(null);
  });

  test("메인 스텝이면 stepLabel은 정수 문자열('1')", () => {
    const steps = [mainStep(1)];
    const ctx = resolveStepContext(steps, 0);
    expect(ctx.stepLabel).toBe("1");
    expect(ctx.parentMainLabel).toBe("1");
  });

  test("세 번째 메인 스텝이면 stepLabel === '3', branchLabel === null", () => {
    const steps = [mainStep(10), mainStep(20), mainStep(30)];
    const ctx = resolveStepContext(steps, 2);
    expect(ctx.stepLabel).toBe("3");
    expect(ctx.branchLabel).toBe(null);
    expect(ctx.parentMainLabel).toBe("3");
  });

  test("분기 사이에 낀 메인 스텝은 분기를 건너뛰고 순번을 센다", () => {
    // [main(1), branch(101 of 1), main(2)]
    const steps = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    const ctx = resolveStepContext(steps, 2);
    expect(ctx.branchLabel).toBe(null);
    expect(ctx.stepLabel).toBe("2");
  });
});

describe("resolveStepContext - 분기 스텝", () => {
  test("첫 번째 분기 스텝이면 branchLabel === '1.1'", () => {
    const steps = [mainStep(1), branchStep(101, 1, 0)];
    const ctx = resolveStepContext(steps, 1);
    expect(ctx.branchLabel).toBe("1.1");
    expect(ctx.parentMainLabel).toBe("1");
    expect(ctx.stepLabel).toBe("1.1");
  });

  test("두 번째 분기(siblingIndex=1)이면 branchLabel === '1.2'", () => {
    const steps = [mainStep(1), branchStep(101, 1, 0), branchStep(102, 1, 1)];
    const ctx = resolveStepContext(steps, 2);
    expect(ctx.branchLabel).toBe("1.2");
    expect(ctx.parentMainLabel).toBe("1");
  });

  test("두 번째 메인의 분기이면 parentMainLabel === '2', branchLabel === '2.1'", () => {
    const steps = [mainStep(1), mainStep(2), branchStep(201, 2, 0)];
    const ctx = resolveStepContext(steps, 2);
    expect(ctx.branchLabel).toBe("2.1");
    expect(ctx.parentMainLabel).toBe("2");
  });

  test("분기의 분기(평탄화)도 부모 메인 기준으로 라벨을 반환한다", () => {
    // 분기 101(1.1)에서 파생된 분기는 parentMainStepId=1 로 평탄화 → 1.2
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0), // 1.1
      branchStep(102, 1, 1), // 1.2 (평탄화)
    ];
    const ctx = resolveStepContext(steps, 2);
    expect(ctx.branchLabel).toBe("1.2");
    expect(ctx.parentMainLabel).toBe("1");
    expect(ctx.stepLabel).toBe("1.2");
  });
});

describe("resolveStepContext - 경계 케이스", () => {
  test("빈 배열에서 호출하면 branchLabel === null, stepLabel === ''", () => {
    const ctx = resolveStepContext([], 0);
    expect(ctx.branchLabel).toBe(null);
    expect(ctx.stepLabel).toBe("");
  });

  test("index 가 범위를 벗어나면 branchLabel === null, stepLabel === ''", () => {
    const steps = [mainStep(1)];
    const ctx = resolveStepContext(steps, 99);
    expect(ctx.branchLabel).toBe(null);
    expect(ctx.stepLabel).toBe("");
  });
});
