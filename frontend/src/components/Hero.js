import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from "react";
import { DEPTHS } from "../stages/data";
import { I } from "./icons";
export function Hero({ depth, onDepth, concept, setConcept, onStart }) {
    const ref = useRef(null);
    const grow = (el) => {
        if (!el)
            return;
        el.style.height = "auto";
        el.style.height = Math.min(120, el.scrollHeight) + "px";
    };
    const submit = (e) => {
        e?.preventDefault?.();
        if (!concept.trim())
            return;
        onStart();
    };
    return (_jsxs("section", { className: "hero", children: [_jsxs("h1", { children: ["\uC5B4\uB5A4 \uAC1C\uB150\uC744", _jsx("br", {}), "\uAC00\uC7A5 \uBA3C\uC800 \uBC30\uC6CC\uBCFC\uAE4C\uC694?"] }), _jsx("p", { className: "sub", children: "\uD55C \uC904\uB85C \uC785\uB825\uD558\uC2DC\uBA74 \uB3C4\uC640\uB4DC\uB9B4\uAC8C\uC694" }), _jsxs("form", { className: "input-bar", onSubmit: submit, children: [_jsxs("label", { className: "depth-select", children: [DEPTHS.find((d) => d.value === depth)?.label || "0depth", _jsx("span", { className: "chev", children: I.chevSmall }), _jsx("select", { value: depth, onChange: (e) => onDepth(e.target.value), children: DEPTHS.map((d) => (_jsxs("option", { value: d.value, children: [d.label, " \u00B7 ", d.hint] }, d.value))) })] }), _jsx("textarea", { ref: ref, rows: 1, autoFocus: true, placeholder: "\uBC30\uC6B0\uACE0 \uC2F6\uC740 \uAC1C\uB150\uC744 \uC785\uB825\uD574\uC11C \uC2DC\uC791\uD574\uBCF4\uC138\uC694", value: concept, onChange: (e) => {
                            setConcept(e.target.value);
                            grow(e.target);
                        }, onKeyDown: (e) => {
                            if (e.key === "Enter" && !e.shiftKey)
                                submit(e);
                        } }), _jsx("button", { className: "btn-capture", type: "submit", children: "\uD559\uC2B5 \uC2DC\uC791" })] })] }));
}
