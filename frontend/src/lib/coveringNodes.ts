import { normalizeStepTitle } from "./stepTitle";
import type { Step } from "../stages/data";

/**
 * findCoveringNodes - 중복 억제된 개념을 커버하는 roadmap 노드 탐지 순수 함수.
 *
 * 억제 대상 개념명(conceptName)과 roadmap 배열을 입력받아,
 * normalizeStepTitle 정규화 비교로 동일 개념을 다루는 노드를 반환한다.
 *
 * 사용 시점:
 *  - 분기 단계 삽입이 억제(suppressed)된 뒤, 해당 개념이 기존 로드맵
 *    어느 노드에 이미 포함되어 있는지 파악할 때 호출한다.
 *  - isDuplicateStep / canInsertBranchStep 이 "억제"를 결정한 뒤,
 *    사용자에게 "이 개념은 N번 단계에서 다룹니다"를 안내하는 데 활용한다.
 *
 * @param conceptName  삽입이 억제된 분기 단계의 개념명 (제목)
 * @param roadmap      현재 로드맵의 모든 단계 (원본 + 기삽입 분기 포함)
 * @returns            동일 개념을 커버하는 노드 배열 (없으면 빈 배열)
 */
export function findCoveringNodes(conceptName: string, roadmap: Step[]): Step[] {
  const normalizedConcept = normalizeStepTitle(conceptName);
  return roadmap.filter((step) => normalizeStepTitle(step.title) === normalizedConcept);
}
