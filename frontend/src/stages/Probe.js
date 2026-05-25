import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { estimateLevel, } from "./data";
import { useLearnContent } from "../state/LearnContent";
import { describeErrorCode } from "../lib/errors";
function ChoiceRow({ p, value, onChange, highlightRequired, }) {
    return (_jsxs("div", { className: "probe-row" + (highlightRequired ? " is-required-missing" : ""), children: [_jsxs("div", { className: "probe-q", children: [p.q, " ", _jsx("span", { className: "probe-badge probe-badge--required", children: "\uD544\uC218" })] }), p.sub && _jsx("div", { className: "probe-sub", children: p.sub }), highlightRequired && (_jsx("div", { className: "probe-error", children: "\uC120\uD0DD\uC9C0\uB97C \uD558\uB098 \uACE8\uB77C\uC8FC\uC138\uC694." })), _jsx("div", { className: "probe-choices", children: p.options.map((o) => (_jsxs("button", { type: "button", className: "probe-choice" + (value === o.value ? " is-active" : ""), onClick: () => onChange(o.value), children: [_jsx("span", { className: "probe-radio", "aria-hidden": true }), _jsx("span", { className: "probe-label", children: o.label })] }, o.value))) })] }));
}
function MultiRow({ p, value, onToggle, }) {
    const picked = value ?? [];
    return (_jsxs("div", { className: "probe-row", children: [_jsxs("div", { className: "probe-q", children: [p.q, " ", _jsx("span", { className: "probe-badge", children: "\uC120\uD0DD" })] }), _jsx("div", { className: "probe-sub", children: p.sub ?? "건너뛰셔도 괜찮아요." }), _jsx("div", { className: "probe-chips", children: p.options.map((o) => (_jsx("button", { type: "button", className: "probe-chip" + (picked.includes(o.value) ? " is-active" : ""), onClick: () => onToggle(o.value), children: o.label }, o.value))) })] }));
}
function TextRow({ p, value, onChange, }) {
    return (_jsxs("div", { className: "probe-row", children: [_jsxs("div", { className: "probe-q", children: [p.q, " ", _jsx("span", { className: "probe-badge", children: "\uC120\uD0DD" })] }), _jsx("div", { className: "probe-sub", children: "\uAC74\uB108\uB6F0\uC154\uB3C4 \uAD1C\uCC2E\uC544\uC694." }), _jsx("textarea", { className: "probe-text", rows: 2, placeholder: p.placeholder, value: value ?? "", onChange: (e) => onChange(e.target.value) })] }));
}
export function StageProbe({ concept, probes, setProbes, setEstimatedLevel, onPrev, onNext, onRetry, }) {
    const { probeQuestions, probeStatus, probeError, probeFromFallback, } = useLearnContent();
    const requiredFilled = typeof probes.p1 === "number";
    const loading = probeStatus === "loading";
    const [showRequiredError, setShowRequiredError] = useState(false);
    const submit = () => {
        if (!requiredFilled) {
            setShowRequiredError(true);
            return;
        }
        setShowRequiredError(false);
        setEstimatedLevel(estimateLevel(probes, probeQuestions));
        onNext();
    };
    return (_jsxs("section", { className: "stage", children: [_jsxs("header", { className: "stage-head", children: [_jsx("div", { className: "stage-eyebrow", children: "01 \u00B7 \uC218\uC900 \uD655\uC778" }), _jsxs("h2", { className: "stage-title", children: [concept, ", \uBA87 \uAC00\uC9C0\uB9CC \uC9E7\uAC8C \uC5EC\uCB50\uAC8C\uC694"] }), _jsx("p", { className: "stage-sub", children: "\uB2F5\uC744 \uBCF4\uACE0 \uC218\uC900\uC744 \uCD94\uC815\uD574\uC11C \uB2E8\uACC4\uC640 \uAE4A\uC774\uB97C \uB9DE\uCDB0\uB4DC\uB9B4\uAC8C\uC694" })] }), _jsxs("div", { className: "stage-body", children: [loading && (_jsx("p", { className: "stage-sub", children: "\uAC1C\uB150\uC5D0 \uB9DE\uB294 \uC9C4\uB2E8 \uBB38\uD56D\uC744 \uB9CC\uB4E4\uACE0 \uC788\uC2B5\uB2C8\uB2E4\u2026" })), probeStatus === "error" && probeError && (_jsxs("div", { className: "probe-result", role: "alert", children: [_jsx("div", { className: "pr-head", children: _jsx("span", { className: "pr-eyebrow", children: "\uC9C4\uB2E8 \uBB38\uD56D \uC0DD\uC131 \uC2E4\uD328" }) }), _jsx("p", { className: "pr-reason", children: describeErrorCode(probeError.code, probeError.message) }), probeFromFallback && (_jsx("p", { className: "pr-note", children: "\uC0D8\uD50C \uBB38\uD56D\uC744 \uC784\uC2DC\uB85C \uBCF4\uC5EC\uB4DC\uB838\uC5B4\uC694." })), _jsx("button", { className: "btn-ghost", type: "button", onClick: onRetry, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })), !loading && probeQuestions.length > 0 && (_jsx("div", { className: "probe-list", children: probeQuestions.map((p) => {
                            if (p.kind === "choice") {
                                return (_jsx(ChoiceRow, { p: p, value: probes.p1, onChange: (nv) => {
                                        setProbes((prev) => ({ ...prev, p1: nv }));
                                        setShowRequiredError(false);
                                    }, highlightRequired: showRequiredError && !requiredFilled }, p.id));
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
                        }) }))] }), _jsxs("div", { className: "stage-actions", children: [_jsx("button", { className: "btn-ghost", type: "button", onClick: onPrev, children: "\u2190 \uAC1C\uB150 \uB2E4\uC2DC \uC785\uB825" }), _jsx("span", { className: "grow" }), _jsx("button", { className: "btn-holo", type: "button", onClick: submit, disabled: loading, children: "\uB2E8\uACC4 \uB9CC\uB4E4\uAE30 \u2192" })] })] }));
}
