import { describe, test, expect } from "vitest";
import { getLabelForStep, getStepLabel } from "./stepLabel";
import type { Step } from "../stages/data";

// 헬퍼: 원본(비삽입) 단계 생성
function mainStep(id: number): Step {
  return { id, title: `Step ${id}`, desc: "", body: "", questions: [] };
}

// 헬퍼: 삽입(분기) 단계 생성
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

describe("getLabelForStep - 기본 원본 단계", () => {
  test("단일 원본 단계는 '1'을 반환한다", () => {
    const steps = [mainStep(1)];
    expect(getLabelForStep(steps, 0)).toBe("1");
  });

  test("원본 3단계는 1, 2, 3을 반환한다 (zero-pad 없음)", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    expect(getLabelForStep(steps, 0)).toBe("1");
    expect(getLabelForStep(steps, 1)).toBe("2");
    expect(getLabelForStep(steps, 2)).toBe("3");
  });

  test("원본 단계 10개도 zero-pad 없이 정수를 반환한다", () => {
    const steps = Array.from({ length: 10 }, (_, i) => mainStep(i + 1));
    expect(getLabelForStep(steps, 9)).toBe("10");
  });
});

describe("getLabelForStep - 삽입(분기) 단계", () => {
  test("원본 1 뒤에 분기 하나: 1.1을 반환한다", () => {
    // [1(main), 101(branch from 1)]
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0),
    ];
    expect(getLabelForStep(steps, 0)).toBe("1");
    expect(getLabelForStep(steps, 1)).toBe("1.1");
  });

  test("원본 1 뒤에 분기 둘: 1.1, 1.2를 반환한다", () => {
    // [1(main), 101(branch), 102(branch)]
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0),
      branchStep(102, 1, 1),
    ];
    expect(getLabelForStep(steps, 1)).toBe("1.1");
    expect(getLabelForStep(steps, 2)).toBe("1.2");
  });

  test("원본 2개, 각 뒤에 분기: 1.1, 2.1을 반환한다", () => {
    // [1(main), 101(branch of 1), 2(main), 102(branch of 2)]
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0),
      mainStep(2),
      branchStep(102, 2, 0),
    ];
    expect(getLabelForStep(steps, 0)).toBe("1");
    expect(getLabelForStep(steps, 1)).toBe("1.1");
    expect(getLabelForStep(steps, 2)).toBe("2");
    expect(getLabelForStep(steps, 3)).toBe("2.1");
  });

  test("분기의 분기는 같은 메인 아래 다음 형제로 평탄화된다 (1.1.1 생성 안 함)", () => {
    // [1(main), 101(1.1 branch), 102(1.2 branch - from 101 but flattened to same parent)]
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0), // 1.1
      branchStep(102, 1, 1), // 1.2 (101에서 분기했지만 parentMainStepId=1 로 평탄화)
    ];
    expect(getLabelForStep(steps, 0)).toBe("1");
    expect(getLabelForStep(steps, 1)).toBe("1.1");
    expect(getLabelForStep(steps, 2)).toBe("1.2");
  });
});

describe("getLabelForStep - 혼합 배열", () => {
  test("원본 3개 중간에 분기 삽입: 원본 순번이 건너뛰지 않는다", () => {
    // [1(main), 101(branch), 2(main), 3(main)]
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0), // 1.1
      mainStep(2),
      mainStep(3),
    ];
    expect(getLabelForStep(steps, 0)).toBe("1");
    expect(getLabelForStep(steps, 1)).toBe("1.1");
    expect(getLabelForStep(steps, 2)).toBe("2");
    expect(getLabelForStep(steps, 3)).toBe("3");
  });

  test("다수 분기와 원본 혼합: 순번이 일관성 있다", () => {
    // [1, 1.1, 1.2, 2, 2.1, 3]
    const steps = [
      mainStep(10),           // 1
      branchStep(101, 10, 0), // 1.1
      branchStep(102, 10, 1), // 1.2
      mainStep(20),           // 2
      branchStep(201, 20, 0), // 2.1
      mainStep(30),           // 3
    ];
    expect(getLabelForStep(steps, 0)).toBe("1");
    expect(getLabelForStep(steps, 1)).toBe("1.1");
    expect(getLabelForStep(steps, 2)).toBe("1.2");
    expect(getLabelForStep(steps, 3)).toBe("2");
    expect(getLabelForStep(steps, 4)).toBe("2.1");
    expect(getLabelForStep(steps, 5)).toBe("3");
  });
});

describe("getLabelForStep - 경계 케이스", () => {
  test("빈 배열에서 호출하면 빈 문자열을 반환한다", () => {
    expect(getLabelForStep([], 0)).toBe("");
  });

  test("index 가 범위를 벗어나면 빈 문자열을 반환한다", () => {
    const steps = [mainStep(1)];
    expect(getLabelForStep(steps, 5)).toBe("");
    expect(getLabelForStep(steps, -1)).toBe("");
  });

  test("parentMainStepId 가 steps 에 없으면 parentOrdinal 은 0이 된다", () => {
    // steps 에 mainStep(99) 가 없어 parentOrdinal = 0 → "0.1"
    const steps = [branchStep(101, 99, 0)];
    expect(getLabelForStep(steps, 0)).toBe("0.1");
  });
});

// ── getStepLabel(steps, stepId) 단위 테스트 ──

describe("getStepLabel - 비삽입(원본) 단계", () => {
  test("단일 원본 단계의 id 로 '1'을 반환한다", () => {
    const steps = [mainStep(1)];
    expect(getStepLabel(steps, 1)).toBe("1");
  });

  test("원본 3단계를 각 id 로 조회하면 1, 2, 3을 반환한다", () => {
    const steps = [mainStep(10), mainStep(20), mainStep(30)];
    expect(getStepLabel(steps, 10)).toBe("1");
    expect(getStepLabel(steps, 20)).toBe("2");
    expect(getStepLabel(steps, 30)).toBe("3");
  });

  test("비연속 id 의 원본 단계도 배열 순서 기준 정수를 반환한다", () => {
    // id 가 100, 5, 999 이지만 배열 순서로 1, 2, 3
    const steps = [mainStep(100), mainStep(5), mainStep(999)];
    expect(getStepLabel(steps, 100)).toBe("1");
    expect(getStepLabel(steps, 5)).toBe("2");
    expect(getStepLabel(steps, 999)).toBe("3");
  });
});

describe("getStepLabel - 삽입(분기) 단계", () => {
  test("원본 1 뒤 분기 하나: id 로 '1.1'을 반환한다", () => {
    const steps = [mainStep(1), branchStep(101, 1, 0)];
    expect(getStepLabel(steps, 1)).toBe("1");
    expect(getStepLabel(steps, 101)).toBe("1.1");
  });

  test("원본 1 뒤 분기 둘: 각 id 로 '1.1', '1.2'를 반환한다", () => {
    const steps = [mainStep(1), branchStep(101, 1, 0), branchStep(102, 1, 1)];
    expect(getStepLabel(steps, 101)).toBe("1.1");
    expect(getStepLabel(steps, 102)).toBe("1.2");
  });

  test("원본 2개 각각 뒤 분기: id 로 '1.1', '2.1'을 반환한다", () => {
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0),
      mainStep(2),
      branchStep(201, 2, 0),
    ];
    expect(getStepLabel(steps, 101)).toBe("1.1");
    expect(getStepLabel(steps, 201)).toBe("2.1");
  });

  test("분기의 분기는 평탄화: parentMainStepId=1 로 둔 경우 '1.2'를 반환한다", () => {
    // 101에서 파생됐지만 _meta.parentMainStepId=1 로 평탄화 저장
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0), // 1.1
      branchStep(102, 1, 1), // 1.2 (평탄화)
    ];
    expect(getStepLabel(steps, 102)).toBe("1.2");
  });
});

describe("getStepLabel - 혼합 배열 + 다수 분기", () => {
  test("[1, 1.1, 1.2, 2, 2.1, 3] 배열을 stepId 로 전부 검증한다", () => {
    const steps = [
      mainStep(10),           // → "1"
      branchStep(101, 10, 0), // → "1.1"
      branchStep(102, 10, 1), // → "1.2"
      mainStep(20),           // → "2"
      branchStep(201, 20, 0), // → "2.1"
      mainStep(30),           // → "3"
    ];
    expect(getStepLabel(steps, 10)).toBe("1");
    expect(getStepLabel(steps, 101)).toBe("1.1");
    expect(getStepLabel(steps, 102)).toBe("1.2");
    expect(getStepLabel(steps, 20)).toBe("2");
    expect(getStepLabel(steps, 201)).toBe("2.1");
    expect(getStepLabel(steps, 30)).toBe("3");
  });
});

describe("getStepLabel - 경계 케이스", () => {
  test("빈 배열에서 임의 stepId 로 호출하면 빈 문자열을 반환한다", () => {
    expect(getStepLabel([], 1)).toBe("");
  });

  test("존재하지 않는 stepId 는 빈 문자열을 반환한다", () => {
    const steps = [mainStep(1), mainStep(2)];
    expect(getStepLabel(steps, 999)).toBe("");
    expect(getStepLabel(steps, 0)).toBe("");
  });

  test("parentMainStepId 가 steps 에 없는 분기: '0.1'을 반환한다", () => {
    const steps = [branchStep(101, 99, 0)]; // 99 는 없음
    expect(getStepLabel(steps, 101)).toBe("0.1");
  });
});
