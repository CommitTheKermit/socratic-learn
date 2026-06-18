import { PI } from "./prereqIcons";

/**
 * 하위 세션 상단 복귀 배너 (breadcrumb 시안 2). 항상 보이며 1탭으로 상위(부모) 개념으로 복귀.
 * "원개념 → 하위 → 하위" 중 어디서든 길을 잃지 않게 한다.
 */
export function ParentReturnBanner({
  parentConcept,
  currentConcept,
  depth,
  onReturn,
}: {
  parentConcept: string;
  currentConcept: string;
  depth: number;
  onReturn: () => void;
}) {
  return (
    <div className="g-bc2">
      <button className="g-bc2-back" type="button" onClick={onReturn}>
        {PI.back}
        상위로
      </button>
      <span className="g-bc2-main">
        <span className="g-bc2-label">돌아갈 곳</span>
        <span className="g-bc2-parent">{parentConcept}</span>
      </span>
      <span className="g-bc2-now">
        <span className="l">지금 학습 중</span>
        <span className="v">{currentConcept}</span>
      </span>
      <span className="g-bc2-depth">깊이 {depth} / 2</span>
    </div>
  );
}
