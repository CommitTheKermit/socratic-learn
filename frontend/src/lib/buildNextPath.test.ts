/**
 * buildNextPath.test.ts
 *
 * Sub-AC 4b: buildNextPath(roadmap, startId) 가 중복 억제된 roadmap 에서
 * startId 부터 끝까지 순회 경로 배열을 누락 없이 생성한다.
 *
 * 핵심 검증:
 *  - 억제된 노드 id 가 경로 배열에 포함되지 않는다
 *  - 억제된 위치의 전후 노드가 연결돼 경로가 끊기지 않는다
 */
import { describe, test, expect } from "vitest";
import { buildNextPath } from "./buildNextPath";
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
// 기본 경로 생성
// ---------------------------------------------------------------------------

describe("buildNextPath - 기본 경로 생성", () => {
  test("메인 단계만 있을 때 처음부터 끝까지 순서대로 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(buildNextPath(roadmap, 1)).toEqual([1, 2, 3]);
  });

  test("startId 가 첫 번째 단계가 아닐 때 해당 지점부터 끝까지 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    expect(buildNextPath(roadmap, 2)).toEqual([2, 3, 4]);
  });

  test("startId 가 마지막 단계이면 [lastId] 만 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(buildNextPath(roadmap, 3)).toEqual([3]);
  });

  test("단일 단계 roadmap 에서 [startId] 를 반환한다", () => {
    const roadmap = [mainStep(5)];
    expect(buildNextPath(roadmap, 5)).toEqual([5]);
  });
});

// ---------------------------------------------------------------------------
// 분기(삽입) 단계가 포함된 경로 생성
// ---------------------------------------------------------------------------

describe("buildNextPath - 분기 포함 경로 생성", () => {
  test("삽입 분기가 포함된 roadmap 에서 경로를 생성한다", () => {
    // [Main1(1), Branch1.1(101), Main2(2)]
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    expect(buildNextPath(roadmap, 1)).toEqual([1, 101, 2]);
  });

  test("삽입 분기부터 시작할 때 분기 이후 경로를 반환한다", () => {
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2), mainStep(3)];
    expect(buildNextPath(roadmap, 101)).toEqual([101, 2, 3]);
  });

  test("복수 분기가 삽입된 경우 모두 포함한 경로를 반환한다", () => {
    // [Main1(1), Branch1.1(101), Branch1.2(102), Main2(2), Main3(3)]
    const roadmap = [
      mainStep(1),
      branchStep(101, 1, 0),
      branchStep(102, 1, 1),
      mainStep(2),
      mainStep(3),
    ];
    expect(buildNextPath(roadmap, 1)).toEqual([1, 101, 102, 2, 3]);
  });

  test("혼합 roadmap: 분기 경로가 순서대로 포함된다", () => {
    // [Main1(1), Branch1.1(101), Main2(2), Branch2.1(201), Main3(3)]
    const roadmap = [
      mainStep(1),
      branchStep(101, 1, 0),
      mainStep(2),
      branchStep(201, 2, 0),
      mainStep(3),
    ];
    expect(buildNextPath(roadmap, 1)).toEqual([1, 101, 2, 201, 3]);
  });
});

// ---------------------------------------------------------------------------
// 중복 억제 후 경로 생성 (Sub-AC 4b 핵심 시나리오)
//
// 억제된 노드는 roadmap 에 삽입되지 않으므로 buildNextPath 결과에 나타나지 않는다.
// 전후 노드가 직접 연결됨으로써 경로는 끊기지 않는다.
// ---------------------------------------------------------------------------

describe("buildNextPath - 중복 억제 후 경로 (Sub-AC 4b 핵심)", () => {
  test("분기가 억제된 roadmap: 억제된 id 없이 메인 단계만 연결된 경로를 반환한다", () => {
    /**
     * 원래 의도: Main1(1) → Branch1.1(101, 억제됨) → Main2(2) → Main3(3)
     * 억제 이유: "동시성과 병렬성"이 이미 Main1 에 존재 (isMerged=true)
     * 실제 roadmap: [Main1(1), Main2(2), Main3(3)]
     */
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    const path = buildNextPath(roadmap, 1);

    // 억제된 101 이 경로에 없다
    expect(path).not.toContain(101);
    // 경로가 끊기지 않는다 (1 바로 다음이 2)
    expect(path).toEqual([1, 2, 3]);
  });

  test("여러 분기가 억제된 경우: 억제된 id 전혀 없이 메인 연결이 유지된다", () => {
    /**
     * 원래 의도: Main1(1) → Branch101(억제) → Branch102(억제) → Main2(2) → Main3(3)
     * 결과 roadmap: [Main1(1), Main2(2), Main3(3)]
     */
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    const path = buildNextPath(roadmap, 1);

    expect(path).not.toContain(101);
    expect(path).not.toContain(102);
    // 전후 노드 연결 유지: 1 → 2 → 3
    expect(path[0]).toBe(1);
    expect(path[1]).toBe(2);
    expect(path[2]).toBe(3);
  });

  test("일부 분기는 삽입, 일부는 억제: 억제된 것만 제외된 경로를 반환한다", () => {
    /**
     * 원래 의도: Main1(1) → Branch101(삽입됨) → Branch102(억제됨) → Main2(2)
     * 결과 roadmap: [Main1(1), Branch101(101), Main2(2)]
     */
    const roadmap = [mainStep(1), branchStep(101, 1, 0, "새로운 개념"), mainStep(2)];
    const path = buildNextPath(roadmap, 1);

    // 억제된 102 가 없다
    expect(path).not.toContain(102);
    // 삽입된 101 은 포함된다
    expect(path).toContain(101);
    // 경로 순서: 1 → 101 → 2 (끊기지 않음)
    expect(path).toEqual([1, 101, 2]);
  });

  test("여러 메인 단계에서 일부만 억제된 경우 경로가 끊기지 않는다", () => {
    /**
     * 원래 의도:
     *   Main1(1) → Branch101(억제) → Main2(2) → Branch201(삽입) → Main3(3) → Branch301(억제)
     * 결과 roadmap: [Main1(1), Main2(2), Branch201(201), Main3(3)]
     */
    const roadmap = [
      mainStep(1),
      mainStep(2),
      branchStep(201, 2, 0, "삽입된 분기"),
      mainStep(3),
    ];
    const path = buildNextPath(roadmap, 1);

    // 억제된 id 들이 없다
    expect(path).not.toContain(101);
    expect(path).not.toContain(301);
    // 삽입된 분기는 포함
    expect(path).toContain(201);
    // 경로 순서: 억제된 위치의 전후가 연결됨
    expect(path).toEqual([1, 2, 201, 3]);

    // Main1(1) 바로 다음이 Main2(2): 억제된 Branch101 을 건너뜀
    const idx1 = path.indexOf(1);
    expect(path[idx1 + 1]).toBe(2);

    // Branch201(201) 바로 다음이 Main3(3): 억제된 Branch301 없이 연결
    const idx201 = path.indexOf(201);
    expect(path[idx201 + 1]).toBe(3);
  });

  test("모든 분기 억제: 원본 4단계만으로 빈틈 없는 경로를 만든다", () => {
    /**
     * 원래 의도: 사용자가 분기를 선택했지만 모두 억제됨
     * 결과 roadmap: 원본 4단계만
     */
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    const path = buildNextPath(roadmap, 1);

    expect(path).toEqual([1, 2, 3, 4]);
    // 연속성 검증: 경로의 인접 요소가 roadmap 에서도 인접하다
    for (let i = 0; i < path.length - 1; i++) {
      const idxInRoadmap = roadmap.findIndex((s) => s.id === path[i]);
      expect(roadmap[idxInRoadmap + 1].id).toBe(path[i + 1]);
    }
  });

  test("억제 후 중간 지점에서 시작해도 경로가 끊기지 않는다", () => {
    /**
     * roadmap: [Main1(1), Main2(2), Branch201(201, 억제됐을 가정과 달리 삽입됨), Main3(3), Main4(4)]
     * 중간인 Main2(2)부터 시작
     */
    const roadmap = [
      mainStep(1),
      mainStep(2),
      branchStep(201, 2, 0),
      mainStep(3),
      mainStep(4),
    ];
    const path = buildNextPath(roadmap, 2);

    expect(path).toEqual([2, 201, 3, 4]);
    // 1 은 포함 안 됨 (시작 이전)
    expect(path).not.toContain(1);
  });
});

// ---------------------------------------------------------------------------
// 억제 노드 포함 여부 명시적 검증 (before-after 연결 검증)
// ---------------------------------------------------------------------------

describe("buildNextPath - 억제 노드 전후 연결 명시 검증", () => {
  test("suppressed id 가 반환 배열에 없어야 하고, 이전 노드와 이후 노드가 인접하다", () => {
    /**
     * suppressed ids: 101, 102
     * roadmap (억제 후): [Main1(1), Main2(2), Main3(3)]
     */
    const suppressedIds = [101, 102];
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    const path = buildNextPath(roadmap, 1);

    // 1) 억제된 노드가 경로에 없다
    for (const sid of suppressedIds) {
      expect(path).not.toContain(sid);
    }

    // 2) 경로가 연속적이다: 배열 길이가 roadmap 길이와 같다 (빈틈 없음)
    expect(path.length).toBe(roadmap.length);

    // 3) 인접 연결: path[i] 다음이 path[i+1]이 됨을 roadmap 으로 검증
    for (let i = 0; i < path.length - 1; i++) {
      const roadmapIdx = roadmap.findIndex((s) => s.id === path[i]);
      expect(roadmap[roadmapIdx + 1].id).toBe(path[i + 1]);
    }
  });

  test("suppressedId 가 분기 사이에 있어도 전후 분기가 직접 연결된다", () => {
    /**
     * 원래 의도: Main1(1) → Branch1.1(101) → SuppressedBranch1.2(102) → Branch1.3(103) → Main2(2)
     * 억제 후 roadmap: [Main1(1), Branch1.1(101), Branch1.3(103), Main2(2)]
     *   (siblingIndex 는 0-based 이므로 103 은 siblingIndex=1로 저장된다)
     */
    const roadmap = [
      mainStep(1),
      branchStep(101, 1, 0, "Branch1.1"),
      branchStep(103, 1, 1, "Branch1.3"),  // 억제 후 sibling 재배치
      mainStep(2),
    ];
    const path = buildNextPath(roadmap, 1);

    // 억제된 102 없음
    expect(path).not.toContain(102);
    // 101 바로 다음이 103 (건너뜀 없이 연결)
    const idx101 = path.indexOf(101);
    expect(path[idx101 + 1]).toBe(103);
    // 전체 경로
    expect(path).toEqual([1, 101, 103, 2]);
  });
});

// ---------------------------------------------------------------------------
// 경계 케이스
// ---------------------------------------------------------------------------

describe("buildNextPath - 경계 케이스", () => {
  test("빈 roadmap 이면 빈 배열을 반환한다", () => {
    expect(buildNextPath([], 1)).toEqual([]);
  });

  test("startId 가 roadmap 에 없으면 빈 배열을 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(buildNextPath(roadmap, 999)).toEqual([]);
  });

  test("단일 단계 roadmap 에서 startId 가 해당 단계이면 [id] 를 반환한다", () => {
    const roadmap = [mainStep(42)];
    expect(buildNextPath(roadmap, 42)).toEqual([42]);
  });

  test("마지막 단계부터 시작하면 [lastId] 만 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(buildNextPath(roadmap, 3)).toEqual([3]);
  });

  test("분기 단계가 마지막 단계인 경우 [branchId] 만 반환한다", () => {
    const roadmap = [mainStep(1), branchStep(101, 1, 0)];
    expect(buildNextPath(roadmap, 101)).toEqual([101]);
  });
});
