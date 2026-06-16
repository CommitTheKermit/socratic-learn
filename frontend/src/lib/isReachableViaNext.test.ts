/**
 * isReachableViaNext.test.ts
 *
 * Sub-AC 4c-2: roadmap_next 체인으로 커버 노드 도달 가능성 검증 함수
 *
 * 검증 항목:
 *  - 직접 인접: startId 바로 다음 노드가 targetId 인 경우 true
 *  - 다중 홉: startId 에서 여러 링크를 따라 targetId 에 도달하는 경우 true
 *  - 역방향 불가: targetId 가 startId 보다 앞에 있으면 false
 *  - 자기 자신: startId === targetId 는 true
 *  - 분기 포함 체인: 삽입 분기를 경유한 도달 검증
 *  - 경계 케이스: 빈 roadmap, 존재하지 않는 id, 마지막 노드
 */
import { describe, test, expect } from "vitest";
import { isReachableViaNext } from "./isReachableViaNext";
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
// 기본 메인 단계 도달 가능성
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 기본 메인 단계 도달 가능성", () => {
  test("직접 인접: 1 에서 2 로 도달 가능하다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 1, 2)).toBe(true);
  });

  test("다중 홉: 1 에서 3 으로 도달 가능하다 (1→2→3)", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 1, 3)).toBe(true);
  });

  test("더 긴 체인: 1 에서 4 로 도달 가능하다 (1→2→3→4)", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    expect(isReachableViaNext(roadmap, 1, 4)).toBe(true);
  });

  test("중간 지점에서 시작: 2 에서 4 로 도달 가능하다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    expect(isReachableViaNext(roadmap, 2, 4)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 역방향 불가 (roadmap_next 는 전방향 단방향)
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 역방향 도달 불가", () => {
  test("역방향: 2 에서 1 로 도달 불가하다 (roadmap_next 는 단방향 전진)", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 2, 1)).toBe(false);
  });

  test("역방향 다중 홉: 3 에서 1 로 도달 불가하다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    expect(isReachableViaNext(roadmap, 3, 1)).toBe(false);
  });

  test("역방향: 마지막에서 첫 번째로 도달 불가하다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 3, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 자기 자신 도달 가능성 (startId === targetId)
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 자기 자신 도달 가능성", () => {
  test("startId === targetId 이면 true 를 반환한다 (메인 단계)", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 2, 2)).toBe(true);
  });

  test("startId === targetId 이면 true 를 반환한다 (첫 번째 단계)", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 1, 1)).toBe(true);
  });

  test("startId === targetId 이면 true 를 반환한다 (분기 단계)", () => {
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    expect(isReachableViaNext(roadmap, 101, 101)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 분기(삽입) 단계 포함 체인 도달 가능성
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 분기 포함 체인 도달 가능성", () => {
  test("메인 → 분기: Main1 에서 Branch1.1 로 도달 가능하다", () => {
    // [Main1(1), Branch1.1(101), Main2(2)]
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    expect(isReachableViaNext(roadmap, 1, 101)).toBe(true);
  });

  test("분기 → 메인: Branch1.1 에서 Main2 로 도달 가능하다", () => {
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    expect(isReachableViaNext(roadmap, 101, 2)).toBe(true);
  });

  test("분기를 경유한 다중 홉: Main1 에서 Main2 로 분기 경유 도달 가능하다", () => {
    // [Main1(1), Branch1.1(101), Main2(2), Main3(3)]
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 1, 2)).toBe(true);  // 1→101→2
    expect(isReachableViaNext(roadmap, 1, 3)).toBe(true);  // 1→101→2→3
  });

  test("복수 분기 경유: Main1 에서 Main2 로 두 분기 경유 도달 가능하다", () => {
    // [Main1(1), Branch1.1(101), Branch1.2(102), Main2(2)]
    const roadmap = [
      mainStep(1),
      branchStep(101, 1, 0),
      branchStep(102, 1, 1),
      mainStep(2),
    ];
    expect(isReachableViaNext(roadmap, 1, 102)).toBe(true);  // 1→101→102
    expect(isReachableViaNext(roadmap, 1, 2)).toBe(true);    // 1→101→102→2
    expect(isReachableViaNext(roadmap, 101, 2)).toBe(true);  // 101→102→2
  });

  test("복잡한 혼합 roadmap: 전체 경로 도달 가능성 확인", () => {
    // [Main1(1), Branch1.1(101), Main2(2), Branch2.1(201), Main3(3)]
    const roadmap = [
      mainStep(1),
      branchStep(101, 1, 0),
      mainStep(2),
      branchStep(201, 2, 0),
      mainStep(3),
    ];
    // 전방향 도달 가능 케이스
    expect(isReachableViaNext(roadmap, 1, 3)).toBe(true);    // 1→101→2→201→3
    expect(isReachableViaNext(roadmap, 101, 201)).toBe(true); // 101→2→201
    expect(isReachableViaNext(roadmap, 2, 3)).toBe(true);    // 2→201→3
  });

  test("역방향: 분기에서 이전 메인 단계로 도달 불가하다", () => {
    const roadmap = [mainStep(1), branchStep(101, 1, 0), mainStep(2)];
    // Branch1.1(101) 에서 Main1(1) 은 이미 지난 노드 → 도달 불가
    expect(isReachableViaNext(roadmap, 101, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 중복 억제 후 도달 가능성 (Sub-AC 4c-2 핵심 시나리오)
//
// 억제된 노드는 roadmap 에 없으므로, roadmap_next 체인은 억제 위치를 자동으로 건너뛴다.
// 억제 전후 노드가 직접 연결되므로 커버 노드까지 도달 가능성은 유지된다.
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 중복 억제 후 도달 가능성 (Sub-AC 4c-2 핵심)", () => {
  test("억제된 분기 위치를 건너뛰어 다음 메인 단계에 도달 가능하다", () => {
    /**
     * 원래 의도: Main1(1) → Branch101(억제됨) → Main2(2)
     * 억제 이유: isMerged=true (커버 노드가 로드맵 내 존재)
     * 결과 roadmap: [Main1(1), Main2(2)]
     */
    const roadmap = [mainStep(1, "동시성과 병렬성"), mainStep(2, "스레드의 비용")];
    // Main2 는 Main1 에서 direct-next 로 도달 가능 (억제된 Branch101 이 없으므로 바로 연결)
    expect(isReachableViaNext(roadmap, 1, 2)).toBe(true);
  });

  test("여러 분기 억제 후 메인 체인 전체에 도달 가능하다", () => {
    /**
     * 여러 분기가 억제되어 원본 4단계만 남은 경우
     * roadmap: [Main1(1), Main2(2), Main3(3), Main4(4)]
     */
    const roadmap = [mainStep(1), mainStep(2), mainStep(3), mainStep(4)];
    expect(isReachableViaNext(roadmap, 1, 4)).toBe(true);
    expect(isReachableViaNext(roadmap, 2, 4)).toBe(true);
  });

  test("일부 억제, 일부 삽입: 삽입 분기를 경유해 커버 노드에 도달 가능하다", () => {
    /**
     * Branch101(삽입됨), Branch102(억제됨)
     * roadmap: [Main1(1), Branch101(101), Main2(2)]
     */
    const roadmap = [mainStep(1), branchStep(101, 1, 0, "새로운 개념"), mainStep(2)];
    // Main1 에서 Main2 에 도달 가능 (101 경유)
    expect(isReachableViaNext(roadmap, 1, 2)).toBe(true);
    // 억제된 102 는 roadmap 에 없으므로, 1 에서 102 도달 불가
    expect(isReachableViaNext(roadmap, 1, 102)).toBe(false);
  });

  test("커버 노드 도달 가능성 검증 패턴: 커버 노드가 startId 이후에 있으면 true", () => {
    /**
     * 시나리오: "스레드의 비용" 개념이 분기로 제안됐지만 억제됨.
     * 억제 이유: 이미 Main2 가 동일 개념을 커버.
     * Main2 는 현재 진도(startId=1, 현재 Main1) 이후에 존재 → 도달 가능.
     */
    const roadmap = [
      mainStep(1, "동시성과 병렬성"),
      mainStep(2, "스레드의 비용"),      // 커버 노드
      mainStep(3, "일시중단 함수"),
    ];
    const coverNodeId = 2;
    const currentStepId = 1;
    // 현재 지점에서 커버 노드에 도달 가능 → 억제 근거가 유효
    expect(isReachableViaNext(roadmap, currentStepId, coverNodeId)).toBe(true);
  });

  test("커버 노드 도달 불가 시나리오: 커버 노드가 startId 이전이면 false", () => {
    /**
     * 시나리오: 현재 Main3 에 있고, "동시성과 병렬성" 개념이 분기로 제안됨.
     * Main1 이 커버 노드이지만 현재 위치(Main3) 이전 → 도달 불가.
     * 이 경우 억제 근거가 약해지므로 분기 삽입을 고려해야 할 수 있다.
     */
    const roadmap = [
      mainStep(1, "동시성과 병렬성"),    // 커버 노드 (이미 지남)
      mainStep(2, "스레드의 비용"),
      mainStep(3, "일시중단 함수"),       // 현재 위치
    ];
    const coverNodeId = 1;    // 이미 지난 노드
    const currentStepId = 3;  // 현재 위치
    expect(isReachableViaNext(roadmap, currentStepId, coverNodeId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 경계 케이스
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 경계 케이스", () => {
  test("빈 roadmap 이면 항상 false 를 반환한다", () => {
    expect(isReachableViaNext([], 1, 2)).toBe(false);
  });

  test("빈 roadmap 이면 startId === targetId 여도 false 를 반환한다", () => {
    // roadmap 에 노드가 없으므로 startId 자체가 존재하지 않음
    expect(isReachableViaNext([], 1, 1)).toBe(false);
  });

  test("startId 가 roadmap 에 없으면 false 를 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 999, 2)).toBe(false);
  });

  test("targetId 가 roadmap 에 없으면 false 를 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 1, 999)).toBe(false);
  });

  test("startId 와 targetId 모두 roadmap 에 없으면 false 를 반환한다", () => {
    const roadmap = [mainStep(1), mainStep(2)];
    expect(isReachableViaNext(roadmap, 999, 888)).toBe(false);
  });

  test("단일 단계 roadmap: startId === targetId 이면 true", () => {
    const roadmap = [mainStep(42)];
    expect(isReachableViaNext(roadmap, 42, 42)).toBe(true);
  });

  test("단일 단계 roadmap: 다른 targetId 이면 false", () => {
    const roadmap = [mainStep(42)];
    expect(isReachableViaNext(roadmap, 42, 43)).toBe(false);
  });

  test("마지막 노드에서 시작하면 자기 자신만 도달 가능하다", () => {
    const roadmap = [mainStep(1), mainStep(2), mainStep(3)];
    expect(isReachableViaNext(roadmap, 3, 3)).toBe(true);
    expect(isReachableViaNext(roadmap, 3, 1)).toBe(false);
    expect(isReachableViaNext(roadmap, 3, 2)).toBe(false);
  });

  test("분기 단계가 마지막인 경우 자기 자신만 도달 가능하다", () => {
    const roadmap = [mainStep(1), branchStep(101, 1, 0)];
    expect(isReachableViaNext(roadmap, 101, 101)).toBe(true);
    expect(isReachableViaNext(roadmap, 101, 1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 모의 roadmap 그래프 - 코루틴 커리큘럼 기반 종합 검증
// ---------------------------------------------------------------------------

describe("isReachableViaNext - 모의 roadmap 그래프 종합 검증", () => {
  /**
   * 모의 roadmap 구조:
   *   Main1(1, 동시성과 병렬성)
   *   Branch1.1(101, 콘커런시 기초)
   *   Main2(2, 스레드의 비용)
   *   Branch2.1(201, 컨텍스트 스위칭)
   *   Branch2.2(202, 스레드 풀)
   *   Main3(3, 일시중단 함수)
   *   Main4(4, 코루틴이 가벼운 이유)
   */
  const MOCK_ROADMAP: Step[] = [
    mainStep(1, "동시성과 병렬성"),
    branchStep(101, 1, 0, "콘커런시 기초"),
    mainStep(2, "스레드의 비용"),
    branchStep(201, 2, 0, "컨텍스트 스위칭"),
    branchStep(202, 2, 1, "스레드 풀"),
    mainStep(3, "일시중단 함수"),
    mainStep(4, "코루틴이 가벼운 이유"),
  ];

  test("도달 가능 케이스: Main1 → Main4 (전체 체인)", () => {
    expect(isReachableViaNext(MOCK_ROADMAP, 1, 4)).toBe(true);
  });

  test("도달 가능 케이스: Branch1.1 → Main3 (분기에서 이후 메인)", () => {
    expect(isReachableViaNext(MOCK_ROADMAP, 101, 3)).toBe(true);
  });

  test("도달 가능 케이스: Main2 → Branch2.2 (직접 분기 아님, 201 경유)", () => {
    // Main2 → Branch2.1(201) → Branch2.2(202) → Main3 체인에서 202 도달
    expect(isReachableViaNext(MOCK_ROADMAP, 2, 202)).toBe(true);
  });

  test("도달 가능 케이스: Branch2.1 → Main4 (분기에서 끝까지)", () => {
    expect(isReachableViaNext(MOCK_ROADMAP, 201, 4)).toBe(true);
  });

  test("도달 불가 케이스: Main3 → Branch1.1 (역방향)", () => {
    expect(isReachableViaNext(MOCK_ROADMAP, 3, 101)).toBe(false);
  });

  test("도달 불가 케이스: Main4 → Main2 (역방향)", () => {
    expect(isReachableViaNext(MOCK_ROADMAP, 4, 2)).toBe(false);
  });

  test("도달 불가 케이스: Branch2.2 → Branch1.1 (역방향 분기)", () => {
    expect(isReachableViaNext(MOCK_ROADMAP, 202, 101)).toBe(false);
  });

  test("자기 자신 도달 가능: 모든 노드 id 에서 자기 자신으로 도달", () => {
    for (const step of MOCK_ROADMAP) {
      expect(isReachableViaNext(MOCK_ROADMAP, step.id, step.id)).toBe(true);
    }
  });

  test("마지막 노드(4)에서는 자기 자신 외 도달 불가", () => {
    const otherIds = MOCK_ROADMAP.filter((s) => s.id !== 4).map((s) => s.id);
    for (const id of otherIds) {
      expect(isReachableViaNext(MOCK_ROADMAP, 4, id)).toBe(false);
    }
  });
});
