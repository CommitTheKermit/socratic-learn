import type { Step } from "../stages/data";

/**
 * 계층형 십진수 라벨 계산 (순수 함수).
 *
 * - 원본(비삽입) Step: 앞에 있는 원본 단계 수 + 1 = 정수 (1, 2, 3...)
 * - 삽입(분기) Step: 부모 메인 정수 + "." + 형제순번 (1.1, 1.2...)
 * - 3-depth(1.1.1)는 생성하지 않음. 분기의 분기는 같은 메인의 다음 형제로 평탄화.
 * - zero-pad 없음.
 *
 * @param steps 현재 steps 배열 (원본 + 삽입 혼합 가능)
 * @param index 라벨을 구할 단계의 인덱스
 */
export function getLabelForStep(steps: Step[], index: number): string {
  const step = steps[index];
  if (!step) return "";

  if (!step._meta) {
    // 비삽입(원본) 단계: index 0 부터 현재까지 원본 단계 수를 세어 정수 반환
    let count = 0;
    for (let i = 0; i <= index; i++) {
      if (!steps[i]._meta) count++;
    }
    return String(count);
  }

  // 삽입(분기) 단계: 부모 메인 단계의 정수 라벨을 먼저 구함
  const { parentMainStepId, siblingIndex } = step._meta;
  let parentOrdinal = 0;
  for (const s of steps) {
    if (!s._meta) {
      parentOrdinal++;
      if (s.id === parentMainStepId) break;
    }
  }
  return `${parentOrdinal}.${siblingIndex + 1}`;
}
