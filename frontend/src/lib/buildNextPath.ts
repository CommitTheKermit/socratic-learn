import type { Step } from "../stages/data";
import { resolveNextNode } from "./resolveNextNode";

/**
 * buildNextPath - 중복 억제된 roadmap에서 startId부터 끝까지 순회 경로 배열 생성 (순수 함수).
 *
 * - 억제된(삽입되지 않은) 노드는 roadmap 에 존재하지 않으므로 자동으로 제외된다.
 * - 억제된 위치의 전후 노드가 직접 연결되어 경로가 끊기지 않는다.
 * - startId 가 roadmap 에 없으면 빈 배열을 반환한다.
 *
 * @param roadmap  현재 steps 배열 (원본 + 삽입 분기 혼합. 억제된 노드는 포함되지 않는다)
 * @param startId  순회를 시작할 단계의 id
 * @returns        startId 부터 마지막 단계까지의 id 배열 (startId 포함)
 */
export function buildNextPath(roadmap: Step[], startId: number): number[] {
  const startIndex = roadmap.findIndex((s) => s.id === startId);
  if (startIndex === -1) return [];

  const path: number[] = [startId];
  let current: number | null = startId;

  while (true) {
    current = resolveNextNode(roadmap, current);
    if (current === null) break;
    path.push(current);
  }

  return path;
}
