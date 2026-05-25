import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PHASES } from "../stages/data";
import { useLearnContent } from "../state/LearnContent";
export function ProgressBar({ stage, stepIdx }) {
    const currentPhaseIdx = PHASES.findIndex((p) => p.id === stage);
    const { steps } = useLearnContent();
    const stepsCount = Math.max(steps.length, 1);
    return (_jsx("div", { className: "phase-bar", children: PHASES.map((p, i) => {
            const state = i < currentPhaseIdx ? "done" : i === currentPhaseIdx ? "curr" : "todo";
            let fillPct = 0;
            if (state === "done")
                fillPct = 100;
            else if (state === "curr") {
                if (p.id === "learn")
                    fillPct = ((stepIdx + 1) / stepsCount) * 100;
                else
                    fillPct = 100;
            }
            return (_jsxs("div", { className: `pb-seg is-${state}`, children: [_jsx("span", { className: "pb-track", children: _jsx("span", { className: "pb-fill", style: { width: fillPct + "%" } }) }), _jsxs("span", { className: "pb-label", children: [_jsx("span", { className: "pb-num", children: String(i + 1).padStart(2, "0") }), _jsx("span", { className: "pb-name", children: p.label }), p.id === "learn" && state === "curr" && (_jsxs("span", { className: "pb-sub", children: ["\uAC1C\uB150 ", Math.min(stepIdx + 1, stepsCount), "/", stepsCount] }))] })] }, p.id));
        }) }));
}
