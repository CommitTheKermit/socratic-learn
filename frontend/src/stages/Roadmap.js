import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { LEVEL_LABELS, STEPS } from "./data";
import { StageShell } from "./StageShell";
export function StageRoadmap({ concept, level, onPrev, onNext }) {
    const safeLevel = level ?? 2;
    return (_jsx(StageShell, { eyebrow: "02 \u00B7 \uB2E8\uACC4 \uC81C\uC2DC", title: _jsxs(_Fragment, { children: [concept, ", \uC774\uB807\uAC8C \uD480\uC5B4\uB4DC\uB9B4\uAC8C\uC694"] }), sub: `${LEVEL_LABELS[safeLevel]} 기준 · ${STEPS.length}개 개념 · 각 개념마다 짧은 확인 질문`, prev: onPrev, prevLabel: "\uC218\uC900 \uD655\uC778 \uB2E4\uC2DC \uBCF4\uAE30", next: onNext, nextLabel: "\uCCAB \uAC1C\uB150 \uC2DC\uC791 \u2192", children: _jsx("ol", { className: "roadmap-list", children: STEPS.map((step, i) => (_jsxs("li", { className: "roadmap-row", children: [_jsx("span", { className: "rm-num", children: String(i + 1).padStart(2, "0") }), _jsxs("span", { className: "rm-body", children: [_jsx("span", { className: "rm-title", children: step.title }), _jsx("span", { className: "rm-desc", children: step.desc })] }), _jsxs("span", { className: "rm-meta", children: [step.questions.length, "\uBB38\uD56D"] })] }, step.id))) }) }));
}
