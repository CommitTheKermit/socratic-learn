import { useLearnContent } from "../state/LearnContent";
import { MathText } from "../lib/mathText";

interface Props {
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

export function StageDone({ onPrev, onRestart }: Props) {
  const { steps } = useLearnContent();

  return (
    <section className="stage">
      <header className="stage-head">
        <h2 className="stage-title">나이스 잡!</h2>
      </header>
      <div className="stage-body">
        <div className="done2">
          {/* 별도 사후 진단이 없으므로 완료를 실력 상승이나 개념 습득으로 표현하지 않는다. */}
          <div className="done2-recap">
            <div className="done2-recap-head">
              <span className="h">이번 학습의 개념</span>
            </div>
            {steps.map((s) => (
              <div className="done2-rc-row" key={s.id}>
                <span className="done2-rc-check">
                  <Check />
                </span>
                <span className="done2-rc-main">
                  <span className="done2-rc-title"><MathText text={s.title} /></span>
                  <span className="done2-rc-take"><MathText text={s.desc} /></span>
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
