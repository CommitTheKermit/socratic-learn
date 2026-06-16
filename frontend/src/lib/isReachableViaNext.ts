import type { Step } from "../stages/data";
import { resolveNextNode } from "./resolveNextNode";

/**
 * isReachableViaNext - startId 에서 roadmap_next 링크를 따라 targetId 에 도달 가능한지 반환 (순수 함수).
 *
 * roadmap_next 링크는 roadmap 배열의 순차 인접 관계로 표현된다.
 * resolveNextNode 를 반복 호출해 체인을 추적하며, targetId 를 만나면 true 를 반환한다.
 *
 * 사용 시점:
 *  - 커버 노드 도달 가능성 검증: 억제(suppressed)된 분기 개념이 현재 roadmap 체인 안에서
 *    실제로 방문 가능한지 확인할 때 호출한다.
 *  - 분기 삽입 억제 근거 보강: isMerged=true / isDuplicateStep=true 로 억제된 경우,
 *    커버 노드까지 경로가 실제로 존재하는지 검증하는 데 사용한다.
 *
 * 특성:
 *  - startId === targetId 이면 true (자기 자신은 항상 도달 가능).
 *  - startId 또는 targetId 가 roadmap 에 없으면 false.
 *  - roadmap 은 DAG(비순환 방향 그래프)이므로 무한 루프가 발생하지 않는다.
 *
 * @param roadmap   현재 steps 배열 (원본 + 삽입 분기 혼합. 억제된 노드는 포함되지 않는다)
 * @param startId   탐색 시작 노드 id
 * @param targetId  도달 목표 노드 id
 * @returns         startId 에서 roadmap_next 체인을 따라 targetId 에 도달 가능하면 true
 */
export function isReachableViaNext(roadmap: Step[], startId: number, targetId: number): boolean {
  // startId 가 roadmap 에 존재하지 않으면 그래프 진입 자체가 불가 → false
  if (!roadmap.some((s) => s.id === startId)) return false;

  let current: number | null = startId;

  while (current !== null) {
    if (current === targetId) return true;
    current = resolveNextNode(roadmap, current);
  }

  return false;
}
