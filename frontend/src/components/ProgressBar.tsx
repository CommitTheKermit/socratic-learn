import {
  LEARN_STAGES,
  PHASES,
  STAGE_LABELS,
  STEPS,
  phaseOf,
  type Stage,
} from "../stages/data";

interface Props {
  stage: Stage;
  stepIdx: number;
}

export function ProgressBar({ stage, stepIdx }: Props) {
  const currentPhase = phaseOf(stage);
  const currentPhaseIdx = PHASES.findIndex((p) => p.id === currentPhase);

  const stepsCount = STEPS.length;
  const subSlot = LEARN_STAGES.indexOf(stage);
  const subDone =
    currentPhase === "learn"
      ? (stepIdx + Math.max(0, subSlot) / LEARN_STAGES.length) / stepsCount
      : currentPhase === "done"
        ? 1
        : 0;

  return (
    <div className="phase-bar">
      {PHASES.map((p, i) => {
        const state = i < currentPhaseIdx ? "done" : i === currentPhaseIdx ? "curr" : "todo";
        let fillPct = 0;
        if (state === "done") fillPct = 100;
        if (state === "curr" && p.id === "learn") fillPct = subDone * 100;
        if (state === "curr" && p.id !== "learn") fillPct = 100;
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
                  개념 {stepIdx + 1}/{stepsCount} · {STAGE_LABELS[stage]}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
