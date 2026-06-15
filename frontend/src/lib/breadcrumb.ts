import type { Step } from "../stages/data";
import { resolveStepContext } from "../state/stepContext";

/**
 * buildBreadcrumb - 현재 학습 위치 경로 세그먼트 배열을 반환하는 순수 함수.
 *
 * 반환 형식:
 *  - 메인 스텝: [concept, "label title", "n/total"]  (3개)
 *  - 분기 스텝: [concept, "label parentTitle", "label.n branchTitle", "n/total"]  (4개)
 *
 * @param concept  학습 개념 문자열 (첫 번째 세그먼트)
 * @param steps    현재 steps 배열 (원본 + 삽입 분기 혼합)
 * @param currentIndex  현재 스텝 인덱스
 * @returns 경로 세그먼트 문자열 배열
 */
export function buildBreadcrumb(
  concept: string,
  steps: Step[],
  currentIndex: number
): string[] {
  const n = currentIndex + 1;
  const total = steps.length;
  const position = `${n}/${total}`;

  const ctx = resolveStepContext(steps, currentIndex);
  const currentStep = steps[currentIndex];

  if (!currentStep) {
    return [concept, position];
  }

  if (ctx.branchLabel === null) {
    // 메인 스텝 - 3 세그먼트
    const mainSegment = `${ctx.stepLabel} ${currentStep.title}`;
    return [concept, mainSegment, position];
  }

  // 분기 스텝 - 4 세그먼트
  // 부모 메인 스텝 제목을 찾는다
  const parentMainStepId = currentStep._meta?.parentMainStepId;
  const parentMain = steps.find(
    (s) => !s._meta && s.id === parentMainStepId
  );
  const mainSegment = parentMain
    ? `${ctx.parentMainLabel} ${parentMain.title}`
    : ctx.parentMainLabel;

  const branchSegment = `${ctx.branchLabel} ${currentStep.title}`;
  return [concept, mainSegment, branchSegment, position];
}
