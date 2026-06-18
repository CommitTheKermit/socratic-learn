import { PI } from "./prereqIcons";

/**
 * "선행 개념 보기" 트리거. 학습 설명 헤더(`.lvv-explain-head` 버튼) 안에 중첩되므로
 * <button> 이 아니라 role="button" span 으로 렌더하고 클릭/키 이벤트의 전파를 막아
 * 헤더의 접기/펼치기 토글과 충돌하지 않게 한다.
 * - dot: 신규 기능 강조용 핑 도트(기본 표시).
 * - disabled: 깊이 2(한계)에서 비활성 모습(실제 진입은 DepthLimitCard 로 대체).
 */
export function PrereqTrigger({
  onClick,
  disabled,
  dot = true,
}: {
  onClick: () => void;
  disabled?: boolean;
  dot?: boolean;
}) {
  const activate = () => {
    if (!disabled) onClick();
  };
  return (
    <span
      className={"pq-trigger" + (disabled ? " is-disabled" : "")}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      title="이 개념이 너무 어려울 때, 먼저 알아야 할 선행 개념을 봅니다"
      onClick={(e) => {
        e.stopPropagation();
        activate();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          activate();
        }
      }}
    >
      <span className="pq-trigger-ico" aria-hidden>
        {PI.branch}
      </span>
      <span>
        <b>선행 개념 보기</b>
      </span>
      {dot && <span className="pq-trigger-dot is-ping" aria-hidden />}
    </span>
  );
}
