import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LEVEL_LABELS, PROBE_QUESTIONS, STEPS, estimateLevel, levelReason, } from "./data";
function ChoiceRow({ p, value, onChange, }) {
    return (_jsxs("div", { className: "probe-row", children: [_jsx("div", { className: "probe-q", children: p.q }), p.sub && _jsx("div", { className: "probe-sub", children: p.sub }), _jsx("div", { className: "probe-choices", children: p.options.map((o) => (_jsxs("button", { type: "button", className: "probe-choice" + (value === o.value ? " is-active" : ""), onClick: () => onChange(o.value), children: [_jsx("span", { className: "probe-radio", "aria-hidden": true }), _jsx("span", { className: "probe-label", children: o.label })] }, o.value))) })] }));
}
function MultiRow({ p, value, onToggle, }) {
    const picked = value ?? [];
    return (_jsxs("div", { className: "probe-row", children: [_jsx("div", { className: "probe-q", children: p.q }), p.sub && _jsx("div", { className: "probe-sub", children: p.sub }), _jsx("div", { className: "probe-chips", children: p.options.map((o) => (_jsx("button", { type: "button", className: "probe-chip" + (picked.includes(o.value) ? " is-active" : ""), onClick: () => onToggle(o.value), children: o.label }, o.value))) })] }));
}
function TextRow({ p, value, onChange, }) {
    return (_jsxs("div", { className: "probe-row", children: [_jsx("div", { className: "probe-q", children: p.q }), _jsx("textarea", { className: "probe-text", rows: 2, placeholder: p.placeholder, value: value ?? "", onChange: (e) => onChange(e.target.value) })] }));
}
export function StageProbe({ concept, probes, setProbes, estimatedLevel, setEstimatedLevel, onPrev, onNext, }) {
    const allAnswered = typeof probes.p1 === "number" && Array.isArray(probes.p2);
    const submitted = estimatedLevel != null;
    const submit = () => {
        setEstimatedLevel(estimateLevel(probes));
    };
    return (_jsxs("section", { className: "stage", children: [_jsxs("header", { className: "stage-head", children: [_jsx("div", { className: "stage-eyebrow", children: "01 \u00B7 \uC218\uC900 \uD655\uC778" }), _jsxs("h2", { className: "stage-title", children: [concept, ", \uBA87 \uAC00\uC9C0\uB9CC \uC9E7\uAC8C \uC5EC\uCB50\uAC8C\uC694"] }), _jsx("p", { className: "stage-sub", children: "\uB2F5\uC744 \uBCF4\uACE0 \uC218\uC900\uC744 \uCD94\uC815\uD574\uC11C \uB2E8\uACC4\uC640 \uAE4A\uC774\uB97C \uB9DE\uCDB0\uB4DC\uB9B4\uAC8C\uC694" })] }), _jsxs("div", { className: "stage-body", children: [_jsx("div", { className: "probe-list", children: PROBE_QUESTIONS.map((p) => {
                            if (p.kind === "choice") {
                                return (_jsx(ChoiceRow, { p: p, value: probes.p1, onChange: (nv) => setProbes((prev) => ({ ...prev, p1: nv })) }, p.id));
                            }
                            if (p.kind === "multi") {
                                return (_jsx(MultiRow, { p: p, value: probes.p2, onToggle: (val) => setProbes((prev) => {
                                        const picked = prev.p2 ?? [];
                                        const next = picked.includes(val)
                                            ? picked.filter((x) => x !== val)
                                            : [...picked, val];
                                        return { ...prev, p2: next };
                                    }) }, p.id));
                            }
                            return (_jsx(TextRow, { p: p, value: probes.p3, onChange: (nv) => setProbes((prev) => ({ ...prev, p3: nv })) }, p.id));
                        }) }), submitted && estimatedLevel != null && (_jsxs("div", { className: "probe-result", children: [_jsxs("div", { className: "pr-head", children: [_jsx("span", { className: "pr-eyebrow", children: "\uC218\uC900 \uCD94\uC815 \uACB0\uACFC" }), _jsxs("span", { className: "pr-level", children: ["L", estimatedLevel, " \u00B7 ", LEVEL_LABELS[estimatedLevel]] })] }), _jsx("p", { className: "pr-reason", children: levelReason(probes, estimatedLevel) }), _jsxs("p", { className: "pr-note", children: ["\uC774 \uCD94\uC815\uC5D0 \uB9DE\uCDB0 ", _jsxs("strong", { children: [STEPS.length, "\uB2E8\uACC4"] }), " \uCF54\uC2A4\uB97C \uC9DC\uB4DC\uB9B4\uAC8C\uC694. \uB2E4\uC74C \uD654\uBA74\uC5D0\uC11C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694."] })] }))] }), _jsxs("div", { className: "stage-actions", children: [_jsx("button", { className: "btn-ghost", type: "button", onClick: onPrev, children: "\u2190 \uAC1C\uB150 \uB2E4\uC2DC \uC785\uB825" }), _jsx("span", { className: "grow" }), !submitted ? (_jsx("button", { className: "btn-holo", type: "button", onClick: submit, disabled: !allAnswered, children: "\uC81C\uCD9C\uD558\uACE0 \uC218\uC900 \uBCF4\uAE30 \u2192" })) : (_jsx("button", { className: "btn-holo", type: "button", onClick: onNext, children: "\uB2E8\uACC4 \uB9CC\uB4E4\uAE30 \u2192" }))] })] }));
}
