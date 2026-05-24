import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LEARN_STAGES, PHASES, STAGE_LABELS, STEPS, phaseOf, } from "../stages/data";
export function ProgressBar({ stage, stepIdx }) {
    const currentPhase = phaseOf(stage);
    const currentPhaseIdx = PHASES.findIndex((p) => p.id === currentPhase);
    const stepsCount = STEPS.length;
    const subSlot = LEARN_STAGES.indexOf(stage);
    const subDone = currentPhase === "learn"
        ? (stepIdx + Math.max(0, subSlot) / LEARN_STAGES.length) / stepsCount
        : currentPhase === "done"
            ? 1
            : 0;
    return (_jsx("div", { className: "phase-bar", children: PHASES.map((p, i) => {
            const state = i < currentPhaseIdx ? "done" : i === currentPhaseIdx ? "curr" : "todo";
            let fillPct = 0;
            if (state === "done")
                fillPct = 100;
            if (state === "curr" && p.id === "learn")
                fillPct = subDone * 100;
            if (state === "curr" && p.id !== "learn")
                fillPct = 100;
            return (_jsxs("div", { className: `pb-seg is-${state}`, children: [_jsx("span", { className: "pb-track", children: _jsx("span", { className: "pb-fill", style: { width: fillPct + "%" } }) }), _jsxs("span", { className: "pb-label", children: [_jsx("span", { className: "pb-num", children: String(i + 1).padStart(2, "0") }), _jsx("span", { className: "pb-name", children: p.label }), p.id === "learn" && state === "curr" && (_jsxs("span", { className: "pb-sub", children: ["\uAC1C\uB150 ", stepIdx + 1, "/", stepsCount, " \u00B7 ", STAGE_LABELS[stage]] }))] })] }, p.id));
        }) }));
}
