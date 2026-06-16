import { describe, test, expect } from "vitest";
import { buildBreadcrumb } from "./breadcrumb";
import type { Step } from "../stages/data";

// 헬퍼: 원본(메인) 단계 생성
function mainStep(id: number, title: string): Step {
  return { id, title, desc: "", body: "", questions: [] };
}

// 헬퍼: 삽입(분기) 단계 생성 (siblingIndex 는 0-based)
function branchStep(id: number, parentMainStepId: number, siblingIndex: number, title: string): Step {
  return {
    id,
    title,
    desc: "",
    body: "",
    questions: [],
    _meta: { parentMainStepId, siblingIndex },
  };
}

describe("buildBreadcrumb - 메인 스텝: 세그먼트 3개", () => {
  test("단일 메인 스텝이면 세그먼트가 3개다", () => {
    const steps = [mainStep(1, "동시성과 병렬성")];
    const result = buildBreadcrumb("코루틴", steps, 0);
    expect(result).toHaveLength(3);
  });

  test("첫 번째 세그먼트는 concept 이다", () => {
    const steps = [mainStep(1, "동시성과 병렬성")];
    const result = buildBreadcrumb("코루틴", steps, 0);
    expect(result[0]).toBe("코루틴");
  });

  test("두 번째 세그먼트는 label + title 이다 (1 동시성과 병렬성)", () => {
    const steps = [mainStep(1, "동시성과 병렬성")];
    const result = buildBreadcrumb("코루틴", steps, 0);
    expect(result[1]).toBe("1 동시성과 병렬성");
  });

  test("세 번째 메인 스텝이면 label 은 '3'이다", () => {
    const steps = [
      mainStep(1, "단계1"),
      mainStep(2, "단계2"),
      mainStep(3, "단계3"),
    ];
    const result = buildBreadcrumb("개념", steps, 2);
    expect(result).toHaveLength(3);
    expect(result[1]).toBe("3 단계3");
  });
});

describe("buildBreadcrumb - n/total 값 정확성", () => {
  test("단일 스텝: n=1, total=1 → '1/1'", () => {
    const steps = [mainStep(1, "A")];
    const result = buildBreadcrumb("개념", steps, 0);
    expect(result[result.length - 1]).toBe("1/1");
  });

  test("3개 스텝 중 두 번째: n=2, total=3 → '2/3'", () => {
    const steps = [mainStep(1, "A"), mainStep(2, "B"), mainStep(3, "C")];
    const result = buildBreadcrumb("개념", steps, 1);
    expect(result[result.length - 1]).toBe("2/3");
  });

  test("total 에는 삽입 분기 스텝도 포함된다", () => {
    // [main1, branch1.1, main2] → total = 3
    const steps = [
      mainStep(1, "A"),
      branchStep(101, 1, 0, "A 심화"),
      mainStep(2, "B"),
    ];
    // currentIndex=0 (main1) → n=1, total=3
    const result = buildBreadcrumb("개념", steps, 0);
    expect(result[result.length - 1]).toBe("1/3");
  });

  test("마지막 스텝이면 n === total", () => {
    const steps = [mainStep(1, "A"), mainStep(2, "B"), mainStep(3, "C")];
    const result = buildBreadcrumb("개념", steps, 2);
    const pos = result[result.length - 1];
    const [n, total] = pos.split("/").map(Number);
    expect(n).toBe(total);
  });
});

describe("buildBreadcrumb - 분기 스텝: 세그먼트 4개", () => {
  test("분기 스텝이면 세그먼트가 4개다", () => {
    const steps = [
      mainStep(1, "동시성과 병렬성"),
      branchStep(101, 1, 0, "심화 내용"),
    ];
    const result = buildBreadcrumb("코루틴", steps, 1);
    expect(result).toHaveLength(4);
  });

  test("첫 번째 세그먼트는 concept 이다", () => {
    const steps = [
      mainStep(1, "동시성과 병렬성"),
      branchStep(101, 1, 0, "심화 내용"),
    ];
    const result = buildBreadcrumb("코루틴", steps, 1);
    expect(result[0]).toBe("코루틴");
  });

  test("두 번째 세그먼트는 부모 메인 label + 부모 제목이다", () => {
    const steps = [
      mainStep(1, "동시성과 병렬성"),
      branchStep(101, 1, 0, "심화 내용"),
    ];
    const result = buildBreadcrumb("코루틴", steps, 1);
    expect(result[1]).toBe("1 동시성과 병렬성");
  });

  test("세 번째 세그먼트는 분기 label + 분기 제목이다 ('1.1 심화 내용')", () => {
    const steps = [
      mainStep(1, "동시성과 병렬성"),
      branchStep(101, 1, 0, "심화 내용"),
    ];
    const result = buildBreadcrumb("코루틴", steps, 1);
    expect(result[2]).toBe("1.1 심화 내용");
  });

  test("두 번째 분기(siblingIndex=1)이면 세 번째 세그먼트 label 은 '1.2'", () => {
    const steps = [
      mainStep(1, "A"),
      branchStep(101, 1, 0, "A-1"),
      branchStep(102, 1, 1, "A-2"),
    ];
    const result = buildBreadcrumb("개념", steps, 2);
    expect(result).toHaveLength(4);
    expect(result[2]).toBe("1.2 A-2");
  });

  test("두 번째 메인의 분기이면 부모 label 은 '2'", () => {
    const steps = [
      mainStep(1, "A"),
      mainStep(2, "B"),
      branchStep(201, 2, 0, "B-1"),
    ];
    const result = buildBreadcrumb("개념", steps, 2);
    expect(result).toHaveLength(4);
    expect(result[1]).toBe("2 B");
    expect(result[2]).toBe("2.1 B-1");
  });

  test("분기 스텝의 n/total 도 정확하다", () => {
    const steps = [
      mainStep(1, "A"),
      branchStep(101, 1, 0, "A-1"),
      mainStep(2, "B"),
    ];
    // currentIndex=1 → n=2, total=3
    const result = buildBreadcrumb("개념", steps, 1);
    expect(result[result.length - 1]).toBe("2/3");
  });
});

describe("buildBreadcrumb - 경계 케이스", () => {
  test("빈 steps 배열이면 [concept, position] 을 반환한다", () => {
    const result = buildBreadcrumb("개념", [], 0);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("개념");
  });

  test("혼합 배열에서 메인-분기-메인 순서: 위치 정확", () => {
    // [main1(idx0), branch1.1(idx1), main2(idx2)]
    const steps = [
      mainStep(1, "A"),
      branchStep(101, 1, 0, "A-1"),
      mainStep(2, "B"),
    ];

    // idx=0: main → 3 segments, n=1, total=3
    const r0 = buildBreadcrumb("개념", steps, 0);
    expect(r0).toHaveLength(3);
    expect(r0[r0.length - 1]).toBe("1/3");

    // idx=1: branch → 4 segments, n=2, total=3
    const r1 = buildBreadcrumb("개념", steps, 1);
    expect(r1).toHaveLength(4);
    expect(r1[r1.length - 1]).toBe("2/3");

    // idx=2: main → 3 segments, n=3, total=3
    const r2 = buildBreadcrumb("개념", steps, 2);
    expect(r2).toHaveLength(3);
    expect(r2[r2.length - 1]).toBe("3/3");
  });
});
