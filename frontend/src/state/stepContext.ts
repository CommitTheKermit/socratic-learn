import type { Step } from "../stages/data";
import { getLabelForStep } from "../lib/stepLabel";

/**
 * resolveStepContext 의 반환 타입.
 * - stepLabel: 계층형 십진수 라벨 ("1", "2.1" 등)
 * - parentMainLabel: 메인 단계 라벨. 분기 스텝이면 부모 메인의 정수, 메인 스텝이면 stepLabel 과 같음
 * - branchLabel: 분기 스텝이면 "k.n" 형식 라벨, 메인 스텝이면 null
 */
export interface StepContext {
  stepLabel: string;
  parentMainLabel: string;
  branchLabel: string | null;
}

/**
 * 현재 스텝이 분기(_meta 보유)인지 메인인지 판별하고 위치 컨텍스트를 반환한다.
 *
 * - 메인 스텝: branchLabel === null, stepLabel === parentMainLabel (정수 문자열)
 * - 분기 스텝: branchLabel === stepLabel ("k.n"), parentMainLabel === "k"
 *
 * @param steps 현재 steps 배열 (원본 + 삽입 혼합)
 * @param currentIndex 컨텍스트를 구할 스텝의 인덱스
 */
export function resolveStepContext(steps: Step[], currentIndex: number): StepContext {
  const step = steps[currentIndex];
  if (!step) {
    return { stepLabel: "", parentMainLabel: "", branchLabel: null };
  }

  const stepLabel = getLabelForStep(steps, currentIndex);

  if (!step._meta) {
    // 원본(메인) 단계 - 분기 라벨 없음
    return { stepLabel, parentMainLabel: stepLabel, branchLabel: null };
  }

  // 삽입(분기) 단계 - 점(.) 앞부분이 부모 메인 라벨
  const parentMainLabel = stepLabel.split(".")[0] ?? stepLabel;
  return { stepLabel, parentMainLabel, branchLabel: stepLabel };
}
