import { PI } from "./prereqIcons";

/**
 * "이 개념이 너무 어려워요 / 선행 개념 보기" 트리거 버튼.
 * - inline: 학습 카드 머리말용 축소 변형(라벨만)
 * - disabled: 깊이 2(한계)에서 비활성 모습(실제 진입은 DepthLimitCard 로 대체)
 */
export function PrereqTrigger({
  inline,
  disabled,
  onClick,
}: {
  inline?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={"pq-trigger" + (inline ? " is-inline" : "") + (disabled ? " is-disabled" : "")}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="pq-trigger-ico">{PI.branch}</span>
      <span>
        <b>이 개념이 너무 어려워요</b>
        {!inline && (
          <>
            <span style={{ color: "var(--fg-dim)", margin: "0 2px" }}>·</span>
            선행 개념 보기
          </>
        )}
      </span>
    </button>
  );
}
