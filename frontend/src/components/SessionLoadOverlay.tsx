import { useEffect, useState } from "react";

const SESSION_LOAD_MSGS = [
  "세션을 불러오는 중",
  "지난 진행 상황을 복원하고 있어요",
  "마지막 단계로 이동하고 있어요",
];

/** 오버레이가 떠 있는 동안 안내 문구를 1.5초 간격으로 순환한다. */
function useLoadMessage(active: boolean, interval = 1500): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) {
      setI(0);
      return;
    }
    const t = window.setInterval(
      () => setI((p) => (p + 1) % SESSION_LOAD_MSGS.length),
      interval,
    );
    return () => window.clearInterval(t);
  }, [active, interval]);
  return SESSION_LOAD_MSGS[i];
}

/**
 * 학습 히스토리 선택 → 세션 불러오는 동안 화면 전체 상호작용을 차단하는 오버레이.
 * position:fixed + inset:0 + 높은 z-index 로 모든 포인터/스크롤 이벤트를 흡수해
 * 아래 UI 로 전달되지 않게 막는다. 설정 고정: 로더 = 점 호흡, 배경 = 옅게.
 */
export function SessionLoadOverlay({
  open,
  title,
  leaving = false,
}: {
  open: boolean;
  title?: string;
  leaving?: boolean;
}) {
  const msg = useLoadMessage(open && !leaving);
  if (!open) return null;
  return (
    <div
      className={"session-overlay" + (leaving ? " is-out" : "")}
      data-wash="veil"
      role="alertdialog"
      aria-busy="true"
      aria-label="세션 불러오는 중"
      onMouseDown={(e) => e.preventDefault()}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="sov-bar">
        <i />
      </div>
      <div className="sov-center">
        <div className="sov-dot-wrap">
          <span className="sov-ring" aria-hidden />
          <span className="sov-dot" aria-hidden />
        </div>
        <div className="sov-text">
          <div key={msg} className="sov-title is-fade">
            {msg}…
          </div>
          {title ? (
            <div className="sov-sub">
              <span className="nm">{title}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
