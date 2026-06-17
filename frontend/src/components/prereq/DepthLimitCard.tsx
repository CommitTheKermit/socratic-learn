import { PI } from "./prereqIcons";

/**
 * 깊이 2(한계) 카드. 선행 개념은 두 단계까지만 중첩하고, 그 다음부터는 독립된 새 학습으로 분리한다.
 * 트리거 자리(학습 카드)에 트리거 대신 노출된다.
 */
export function DepthLimitCard({
  onNewSession,
  onDismiss,
}: {
  onNewSession: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="g-trig-limit">
      <span className="ic">{PI.leaf}</span>
      <span className="g-trig-limit-main">
        <span className="g-trig-limit-title">여기서부터가 기초예요</span>
        <span className="g-trig-limit-sub">
          선행 개념은 두 단계까지만 따라가요. 더 파고들고 싶다면 이 개념을 독립된 새 학습으로 시작하는
          게 좋아요. 지금 트리와 섞이지 않고 깔끔하게 처음부터 다룹니다.
        </span>
        <span className="g-trig-limit-actions">
          <button className="g-newsession" type="button" onClick={onNewSession}>
            {PI.newLearn}새 학습으로 시작
          </button>
          <button className="g-stayhere" type="button" onClick={onDismiss}>
            여기서 계속할게요
          </button>
        </span>
      </span>
    </div>
  );
}
