import type { Step } from "../stages/data";

/**
 * 보충/분기 단계를 "현재 단계 바로 아래 형제(1-1, 1-2…)"로 삽입할 때의 _meta 를 계산한다.
 * - 부모가 원본 단계면 그 단계가 메인(parentMainStepId = 부모 id).
 * - 부모가 이미 삽입된 단계(_meta 보유)면 3-depth 를 막기 위해 같은 메인 아래 형제로 평탄화한다.
 * - siblingIndex = 같은 메인 아래 이미 삽입된 형제 수(=다음 형제 0-based 순번).
 *
 * 분기 선택(handleChoose)과 '질문하기' 보충 진입이 이 계산을 공유한다(중복 제거).
 */
export function computeInsertedMeta(
  steps: Step[],
  parentIdx: number,
): { parentMainStepId: number; siblingIndex: number } {
  const parentStep = steps[parentIdx];
  const parentMainStepId = parentStep?._meta
    ? parentStep._meta.parentMainStepId
    : parentStep?.id ?? 0;
  const siblingIndex = steps.filter(
    (s) => s._meta?.parentMainStepId === parentMainStepId,
  ).length;
  return { parentMainStepId, siblingIndex };
}

/**
 * title/desc 제안으로 삽입용 보충 Step 을 만든다.
 * body/questions 는 진입 시 loadStepDetail(stepDetailStream)이 lazy 생성하므로 비워 둔다.
 * id 는 insertStepAt 이 maxId+1 로 재할당하므로 임시값(0)을 둔다.
 */
export function makeSupplementStep(
  suggestion: { title: string; desc: string },
  meta: { parentMainStepId: number; siblingIndex: number },
): Step {
  return {
    id: 0,
    title: suggestion.title,
    desc: suggestion.desc,
    body: "",
    questions: [],
    _meta: meta,
  };
}
