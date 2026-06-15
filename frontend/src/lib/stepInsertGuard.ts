import { isDuplicateStep } from "./stepTitle";
import type { Step } from "../stages/data";

/**
 * shouldInsertBranchStep - 분기 단계 삽입 가드 순수 함수
 *
 * 추천 분기 단계를 로드맵에 추가하기 전, 이미 동일 개념 단계가 존재하는지 검사한다.
 * isMerged(LLM 의미 동등성 신호) 값과 무관하게:
 *  - isDuplicateStep=true 이면 false 반환 → 삽입 불가
 *  - isDuplicateStep=false 이면 true 반환  → 삽입 허용
 *
 * @param candidate   삽입 예정 단계 (title 만 사용)
 * @param steps       현재 로드맵의 모든 단계 (원본 + 기삽입 분기 포함)
 * @returns           삽입해도 되면 true, 중복이면 false
 */
export function shouldInsertBranchStep(
  candidate: Pick<Step, "title">,
  steps: Pick<Step, "title">[],
): boolean {
  return !isDuplicateStep(candidate.title, steps.map((s) => s.title));
}
