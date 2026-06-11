import { LEVEL_LABELS } from "./data";
import { useLearnContent } from "../state/LearnContent";

interface Props {
  level: number | null;
  onPrev: () => void;
  onRestart: () => void;
}

const Check = () => (
  <svg
    viewBox="0 0 24 24"
    width="13"
    height="13"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const ArrowR = () => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export function StageDone({ level, onPrev, onRestart }: Props) {
  const { steps } = useLearnContent();
  // 도착 수준 = 시작 수준 +1, 최고 단계(LEVEL_LABELS 마지막 index)에서 클램프.
  // level 이 null 이면 측정 근거가 없으므로 수준 변화 카드를 통째로 숨긴다.
  const endLevel = level != null ? Math.min(level + 1, LEVEL_LABELS.length - 1) : null;

  return (
    <section className="stage">
      <header className="stage-head">
        <h2 className="stage-title">나이스 잡!</h2>
      </header>
      <div className="stage-body">
        <div className="done2">
          {level != null && endLevel != null && (
            <div className="done2-lvstrip">
              <div className="done2-lvstrip-top">
                <span className="done2-lvstrip-head">
                  <span className="from">L{level}</span>
                  <span className="arr">
                    <ArrowR />
                  </span>
                  <span className="to">L{endLevel}</span>
                </span>
                <span className="done2-lvstrip-sub">
                  {LEVEL_LABELS[level]} → {LEVEL_LABELS[endLevel]}
                </span>
              </div>
            </div>
          )}
          <div className="done2-recap">
            <div className="done2-recap-head">
              <span className="h">오늘 익힌 것</span>
            </div>
            {steps.map((s) => (
              <div className="done2-rc-row" key={s.id}>
                <span className="done2-rc-check">
                  <Check />
                </span>
                <span className="done2-rc-main">
                  <span className="done2-rc-title">{s.title}</span>
                  <span className="done2-rc-take">{s.desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={onPrev}>
          ← 마지막 답변 다시 보기
        </button>
        <span className="grow" />
        <button className="btn-holo" type="button" onClick={onRestart}>
          메인으로 →
        </button>
      </div>
    </section>
  );
}
