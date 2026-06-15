import { PHASES, type Stage } from "../stages/data";
import { useLearnContent } from "../state/LearnContent";
import { getLabelForStep } from "../lib/stepLabel";

interface Props {
  stage: Stage;
  stepIdx: number;
}

export function ProgressBar({ stage, stepIdx }: Props) {
  const currentPhaseIdx = PHASES.findIndex((p) => p.id === stage);
  const { steps } = useLearnContent();
  const stepsCount = Math.max(steps.length, 1);
  const stepLabel = getLabelForStep(steps, stepIdx);

  return (
    <div className="phase-bar">
      {PHASES.map((p, i) => {
        const state = i < currentPhaseIdx ? "done" : i === currentPhaseIdx ? "curr" : "todo";
        let fillPct = 0;
        if (state === "done") fillPct = 100;
        else if (state === "curr") {
          if (p.id === "learn") fillPct = ((stepIdx + 1) / stepsCount) * 100;
          else fillPct = 100;
        }
        return (
          <div key={p.id} className={`pb-seg is-${state}`}>
            <span className="pb-track">
              <span className="pb-fill" style={{ width: fillPct + "%" }} />
            </span>
            <span className="pb-label">
              <span className="pb-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pb-name">{p.label}</span>
              {p.id === "learn" && state === "curr" && (
                <span className="pb-sub">
                  개념 {stepLabel}/{stepsCount}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
