import { useEffect, useState } from "react";
import { STEPS } from "./data";

interface Props {
  stepIdx: number;
  answers: Record<string, string>;
  setAnswers: (next: Record<string, string>) => void;
  skips: Record<string, boolean>;
  setSkips: (next: Record<string, boolean>) => void;
  onPrev: () => void;
  onStepDone: () => void;
}

export function StageAnswering({
  stepIdx,
  answers,
  setAnswers,
  skips,
  setSkips,
  onPrev,
  onStepDone,
}: Props) {
  const step = STEPS[stepIdx];
  const [qIdx, setQIdx] = useState(0);
  useEffect(() => {
    setQIdx(0);
  }, [stepIdx]);

  const q = step.questions[qIdx];
  const isLast = qIdx === step.questions.length - 1;
  const filled = (answers[q.id] || "").trim().length > 0 || !!skips[q.id];

  const go = (delta: number) => {
    const next = qIdx + delta;
    if (next < 0) onPrev();
    else if (next >= step.questions.length) onStepDone();
    else setQIdx(next);
  };
  const skip = () => {
    setSkips({ ...skips, [q.id]: true });
    setAnswers({ ...answers, [q.id]: "" });
    if (isLast) onStepDone();
    else setQIdx(qIdx + 1);
  };

  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">
          05 · 답변 · 개념 {stepIdx + 1}/{STEPS.length} · Q{qIdx + 1}/{step.questions.length}
        </div>
        <h2 className="stage-title q-prompt">{q.q}</h2>
        <p className="stage-sub">힌트 - {q.hint}</p>
      </header>

      <div className="stage-body">
        <textarea
          key={q.id}
          className="q-answer"
          placeholder="자유롭게 적어주세요. 짧아도 좋아요."
          autoFocus
          value={answers[q.id] || ""}
          onChange={(e) => {
            setAnswers({ ...answers, [q.id]: e.target.value });
            if (skips[q.id]) setSkips({ ...skips, [q.id]: false });
          }}
          rows={4}
        />
        <div className="q-progress" aria-label={`${qIdx + 1} / ${step.questions.length}`}>
          {step.questions.map((_, i) => (
            <i key={i} className={i < qIdx ? "is-done" : i === qIdx ? "is-curr" : ""} />
          ))}
        </div>
      </div>

      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={() => go(-1)}>
          ← {qIdx === 0 ? "설명 다시 보기" : "이전 질문"}
        </button>
        <span className="grow" />
        <button className="btn-text" type="button" onClick={skip}>
          모르겠어요
        </button>
        <button
          className="btn-holo"
          type="button"
          onClick={() => go(1)}
          disabled={!filled}
        >
          {isLast
            ? stepIdx === STEPS.length - 1
              ? "학습 마치기"
              : "다음 개념으로"
            : "다음 질문"}{" "}
          →
        </button>
      </div>
    </section>
  );
}
