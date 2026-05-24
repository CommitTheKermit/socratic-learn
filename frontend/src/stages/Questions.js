import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { STEPS } from "./data";
import { StageShell } from "./StageShell";
export function StageQuestions({ stepIdx, onPrev, onNext }) {
    const step = STEPS[stepIdx];
    return (_jsxs(StageShell, { eyebrow: `04 · 확인 질문 · 개념 ${stepIdx + 1}/${STEPS.length}`, title: _jsxs(_Fragment, { children: [step.title, ", \uC774\uD574 \uD655\uC778\uD560\uAC8C\uC694"] }), sub: `${step.questions.length}개 질문 · 한 문장이면 충분해요`, prev: onPrev, prevLabel: "\uC124\uBA85 \uB2E4\uC2DC \uBCF4\uAE30", next: onNext, nextLabel: "\uB2F5\uBCC0 \uC2DC\uC791 \u2192", children: [_jsx("ol", { className: "q-preview", children: step.questions.map((q, i) => (_jsxs("li", { children: [_jsxs("span", { className: "qn", children: ["Q", i + 1] }), _jsxs("span", { className: "qt", children: [_jsx("span", { className: "qq", children: q.q }), _jsxs("span", { className: "qh", children: ["\uD78C\uD2B8 - ", q.hint] })] })] }, q.id))) }), _jsxs("p", { className: "q-tip", children: ["\uBAA8\uB974\uBA74 ", _jsx("b", { children: "\uBAA8\uB974\uACA0\uC5B4\uC694" }), "\uB97C \uB20C\uB7EC\uB3C4 \uAD1C\uCC2E\uC544\uC694. \uADF8 \uC9C8\uBB38\uC740 \uB2E4\uC74C \uD559\uC2B5\uC5D0\uC11C \uB2E4\uC2DC \uB9CC\uB098\uAC8C \uB429\uB2C8\uB2E4."] })] }));
}
