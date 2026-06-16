/**
 * resolveNextNode.test.ts
 *
 * Sub-AC 4a: resolveNextNode(roadmap, currentId) 가 중복 억제로 건너뛴 노드를 포함해
 * 다음 방문 가능한 노드 id 를 올바르게 반환한다.
 *
 * - 중복 노드가 억제된 roadmap fixture 에서 currentId 의 next 경로를 추적했을 때
 *   빈틈 없이 다음 노드 id 가 리턴되는지 단위 테스트
 */
import { describe, test, expect } from "vitest";
import { resolveNextNode } from "./resolveNextNode";
import type { Step } from "../stages/data";

// 헬퍼: 원본(비삽입) 메인 단계 생성
function mainStep(id: number, title = `Step ${id}`): Step {
  return { id, title, desc: "", body: "", questions: [] };
}

// 헬퍼: 삽입(분기) 단계 생성
function branchStep(id: number, parentMainStepId: number, siblingIndex: number, title = `Branch ${id}`): Step {
  return {
    id,
    title,
    desc: "",
    body: "",
    questions: [],
    _meta: { parentMainStepId, siblingIndex },
  };
}

// ---------------------------------------------------------------------------
// 기본 메인 단계 내비게이션
// ---------------------------------------------------------------------------

describe("resolveNextNode - 기본 메인 단계 내비게이션", () => {
  test("두 번째 메인 단계 id 를 반환한다 (1→2)", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    expect(resolveNextNode(steps, 1)).toBe(2);
  });

  test("세 번째 메인 단계 id 를 반환한다 (2→3)", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    expect(resolveNextNode(steps, 2)).toBe(3);
  });

  test("단계 4개: 연속 내비게이션이 정확하다", () => {
    const steps = [mainStep(10), mainStep(20), mainStep(30), mainStep(40)];
    expect(resolveNextNode(steps, 10)).toBe(20);
    expect(resolveNextNode(steps, 20)).toBe(30);
    expect(resolveNextNode(steps, 30)).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// 분기(삽입) 단계 포함 roadmap 내비게이션
// ---------------------------------------------------------------------------

describe("resolveNextNode - 분기 포함 roadmap 내비게이션", () => {
  test("메인 다음에 삽입 분기가 있으면 분기 id 를 반환한다", () => {
    // [Main1(1), Branch1.1(101), Main2(2)]
    const steps = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    expect(resolveNextNode(steps, 1)).toBe(101);
  });

  test("삽입 분기 다음은 다음 메인 단계 id 를 반환한다", () => {
    const steps = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    expect(resolveNextNode(steps, 101)).toBe(2);
  });

  test("다수 분기가 삽입된 경우 순서대로 내비게이션된다", () => {
    // [Main1(1), Branch1.1(101), Branch1.2(102), Main2(2)]
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0),
      branchStep(102, 1, 1),
      mainStep(2),
    ];
    expect(resolveNextNode(steps, 1)).toBe(101);
    expect(resolveNextNode(steps, 101)).toBe(102);
    expect(resolveNextNode(steps, 102)).toBe(2);
  });

  test("복잡한 혼합 roadmap: [Main1, Branch1.1, Main2, Branch2.1, Main3]", () => {
    const steps = [
      mainStep(1),
      branchStep(101, 1, 0),
      mainStep(2),
      branchStep(201, 2, 0),
      mainStep(3),
    ];
    expect(resolveNextNode(steps, 1)).toBe(101);
    expect(resolveNextNode(steps, 101)).toBe(2);
    expect(resolveNextNode(steps, 2)).toBe(201);
    expect(resolveNextNode(steps, 201)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 중복 억제 후 내비게이션 (Sub-AC 4a 핵심 시나리오)
//
// 중복 노드는 shouldInsertBranchStep / isMerged 방어로 roadmap 에 삽입되지 않는다.
// 억제된 노드는 배열 자체에 없으므로, resolveNextNode 는 빈틈 없이 다음 id 를 반환한다.
// ---------------------------------------------------------------------------

describe("resolveNextNode - 중복 억제 후 빈틈 없는 내비게이션 (Sub-AC 4a)", () => {
  test("분기 단계가 중복으로 억제된 경우: 메인1 다음은 메인2 (빈틈 없음)", () => {
    /**
     * 원래 분기 제안: Branch101("동시성과 병렬성 - 심화")
     * 억제 이유: "동시성과 병렬성" 이 이미 roadmap 에 존재 (isMerged=true 또는 isDuplicateStep=true)
     * 결과 roadmap: [Main1(id:1, "동시성과 병렬성"), Main2(id:2, "스레드의 비용")]
     *              (Branch101 은 억제되어 삽입되지 않음)
     */
    const roadmap = [
      mainStep(1, "동시성과 병렬성"),
      mainStep(2, "스레드의 비용"),
    ];
    // Main1 에서 다음을 구하면 Main2 (억제된 분기를 건너뛰고 바로)
    expect(resolveNextNode(roadmap, 1)).toBe(2);
  });

  test("두 분기 모두 억제된 경우: 메인1 다음은 메인2 (빈틈 없음)", () => {
    /**
     * 원래 제안: Branch101, Branch102 - 둘 다 중복으로 억제
     * 결과 roadmap: [Main1(1), Main2(2), Main3(3)]
     */
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(resolveNextNode(roadmap, 1)).toBe(2);
    expect(resolveNextNode(roadmap, 2)).toBe(3);
  });

  test("첫 번째 분기는 삽입, 두 번째 분기는 억제: 삽입된 분기 다음은 메인2", () => {
    /**
     * 원래 제안: Branch101(삽입됨), Branch102(억제됨 - 중복)
     * 결과 roadmap: [Main1(1), Branch101(101), Main2(2)]
     */
    const roadmap = [
      mainStep(1),
      branchStep(101, 1, 0, "새로운 개념"),
      mainStep(2),
    ];
    // Branch101 다음은 Main2 (Branch102 는 억제되어 없음)
    expect(resolveNextNode(roadmap, 101)).toBe(2);
  });

  test("억제 후 마지막 메인 단계까지 경로가 빈틈 없다", () => {
    /**
     * 원래 제안: Main1 → Branch101(억제) → Main2 → Branch201(삽입) → Main3 → Branch301(억제)
     * 결과 roadmap: [Main1(1), Main2(2), Branch201(201), Main3(3)]
     */
    const roadmap = [
      mainStep(1),
      mainStep(2),
      branchStep(201, 2, 0, "삽입된 분기"),
      mainStep(3),
    ];
    expect(resolveNextNode(roadmap, 1)).toBe(2);    // Main1 → Main2 (Branch101 억제)
    expect(resolveNextNode(roadmap, 2)).toBe(201);  // Main2 → Branch201 (삽입됨)
    expect(resolveNextNode(roadmap, 201)).toBe(3);  // Branch201 → Main3
    expect(resolveNextNode(roadmap, 3)).toBeNull(); // Main3 → 끝
  });

  test("모든 분기 억제 시나리오: 원본 로드맵만 남아 순차 내비게이션", () => {
    /**
     * 사용자가 분기를 선택했지만 모두 isMerged=true 나 isDuplicateStep=true 로 억제된 경우.
     * roadmap 은 원본 4단계만 남아있고, 내비게이션이 정확히 작동해야 한다.
     */
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    let current: number | null = 1;
    const visited: number[] = [current];
    while (current !== null) {
      current = resolveNextNode(roadmap, current);
      if (current !== null) visited.push(current);
    }
    // 1, 2, 3, 4 순서대로 방문, 빈틈 없음
    expect(visited).toEqual([1, 2, 3, 4]);
  });
});

// ---------------------------------------------------------------------------
// 경계 케이스
// ---------------------------------------------------------------------------

describe("resolveNextNode - 경계 케이스", () => {
  test("마지막 단계에서 null 을 반환한다", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    expect(resolveNextNode(steps, 3)).toBeNull();
  });

  test("roadmap 이 단일 단계이면 null 을 반환한다", () => {
    const steps = [mainStep(1)];
    expect(resolveNextNode(steps, 1)).toBeNull();
  });

  test("빈 roadmap 에서 null 을 반환한다", () => {
    expect(resolveNextNode([], 1)).toBeNull();
  });

  test("currentId 가 roadmap 에 없으면 null 을 반환한다", () => {
    const steps = [mainStep(1), mainStep(2), mainStep(3)];
    expect(resolveNextNode(steps, 999)).toBeNull();
  });

  test("분기 단계가 마지막이면 null 을 반환한다", () => {
    const steps = [mainStep(1), branchStep(101, 1, 0)];
    expect(resolveNextNode(steps, 101)).toBeNull();
  });
});
