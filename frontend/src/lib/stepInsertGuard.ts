import { isDuplicateStep } from "./stepTitle";
import type { Step } from "../stages/data";

/**
 * shouldInsertBranchStep - 분기 단계 삽입 가드 순수 함수 (AC3 백스톱)
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

/**
 * canInsertBranchStep - isMerged 소비 로직 + AC3 백스톱을 통합한 순수 함수
 *
 * 분기 단계 삽입 여부를 결정하는 두 레이어를 합산한다:
 *  1. AC2 레이어: optionType === "ai_recommended" && isMerged=true → 삽입 차단
 *     (LLM이 "이미 로드맵에 있다"고 신호한 케이스)
 *  2. AC3 레이어: shouldInsertBranchStep 으로 제목 중복 백스톱
 *     (LLM이 isMerged=false 로 잘못 판단했을 때 프론트가 방어)
 *
 * @param optionType  분기 옵션 타입 ("ai_recommended" | "additional" | ...)
 * @param isMerged    LLM 의 의미 동등성 신호 (EvaluationResponse.isMerged)
 * @param candidate   삽입 예정 단계
 * @param steps       현재 로드맵의 모든 단계
 * @returns           삽입해도 되면 true, 두 레이어 중 하나라도 차단하면 false
 */
export function canInsertBranchStep(
  optionType: string,
  isMerged: boolean,
  candidate: Pick<Step, "title">,
  steps: Pick<Step, "title">[],
): boolean {
  // AC2: ai_recommended + isMerged=true → 삽입 차단
  if (optionType === "ai_recommended" && isMerged) return false;
  // AC3 백스톱: 제목 중복 → 삽입 차단
  return shouldInsertBranchStep(candidate, steps);
}
