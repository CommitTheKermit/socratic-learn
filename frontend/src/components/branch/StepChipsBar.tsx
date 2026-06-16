import type { Step } from "../../stages/data";
import { getLabelForStep } from "../../lib/stepLabel";

interface StepChipsBarProps {
  steps: Step[];
  currentIndex: number;
  /**
   * stage 의 id 가 이 셋에 포함되면 inserted (분기로 삽입된) 칩으로 표시.
   * 점선 보더 + ↳ prefix.
   */
  insertedIds?: ReadonlySet<number>;
}

export function StepChipsBar({ steps, currentIndex, insertedIds }: StepChipsBarProps) {
  return (
    <div className="phase-bar" data-variant="steps">
      {steps.map((s, i) => {
        const state = i < currentIndex ? "done" : i === currentIndex ? "curr" : "todo";
        const inserted = insertedIds?.has(s.id) ?? false;
        const fill = state === "done" ? 100 : state === "curr" ? 50 : 0;
        return (
          <div key={s.id} className={`pb-seg is-${state}${inserted ? " is-inserted" : ""}`}>
            <span className="pb-track">
              <span className="pb-fill" style={{ width: fill + "%" }} />
            </span>
            <span className="pb-label">
              <span className="pb-num">{getLabelForStep(steps, i)}</span>
              <span className="pb-name">{s.title}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
