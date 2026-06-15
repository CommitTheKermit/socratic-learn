import type { Step } from "../stages/data";

/**
 * resolveNextNode - 현재 노드 id 기준으로 다음 방문 가능한 노드 id 반환 (순수 함수).
 *
 * - roadmap 배열에서 currentId 와 일치하는 단계를 찾아 바로 다음 인덱스의 id 를 반환한다.
 * - 중복 억제로 건너뛴(삽입되지 않은) 노드는 roadmap 에 존재하지 않으므로 자연스럽게 스킵된다.
 *   → 빈틈 없이 다음 방문 가능한 id 를 반환한다.
 * - currentId 가 마지막 노드이거나 배열에 없으면 null 을 반환한다.
 *
 * @param roadmap  현재 steps 배열 (원본 + 삽입 분기 혼합. 억제된 노드는 포함되지 않는다)
 * @param currentId  현재 단계의 id
 * @returns 다음 단계의 id, 없으면 null
 */
export function resolveNextNode(roadmap: Step[], currentId: number): number | null {
  const index = roadmap.findIndex((s) => s.id === currentId);
  if (index === -1) return null;
  const next = roadmap[index + 1];
  return next?.id ?? null;
}
