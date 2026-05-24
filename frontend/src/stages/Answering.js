import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { STEPS } from "./data";
export function StageAnswering({ stepIdx, answers, setAnswers, skips, setSkips, onPrev, onStepDone, }) {
    const step = STEPS[stepIdx];
    const [qIdx, setQIdx] = useState(0);
    useEffect(() => {
        setQIdx(0);
    }, [stepIdx]);
    const q = step.questions[qIdx];
    const isLast = qIdx === step.questions.length - 1;
    const filled = (answers[q.id] || "").trim().length > 0 || !!skips[q.id];
    const go = (delta) => {
        const next = qIdx + delta;
        if (next < 0)
            onPrev();
        else if (next >= step.questions.length)
            onStepDone();
        else
            setQIdx(next);
    };
    const skip = () => {
        setSkips({ ...skips, [q.id]: true });
        setAnswers({ ...answers, [q.id]: "" });
        if (isLast)
            onStepDone();
        else
            setQIdx(qIdx + 1);
    };
    return (_jsxs("section", { className: "stage", children: [_jsxs("header", { className: "stage-head", children: [_jsxs("div", { className: "stage-eyebrow", children: ["05 \u00B7 \uB2F5\uBCC0 \u00B7 \uAC1C\uB150 ", stepIdx + 1, "/", STEPS.length, " \u00B7 Q", qIdx + 1, "/", step.questions.length] }), _jsx("h2", { className: "stage-title q-prompt", children: q.q }), _jsxs("p", { className: "stage-sub", children: ["\uD78C\uD2B8 - ", q.hint] })] }), _jsxs("div", { className: "stage-body", children: [_jsx("textarea", { className: "q-answer", placeholder: "\uC790\uC720\uB86D\uAC8C \uC801\uC5B4\uC8FC\uC138\uC694. \uC9E7\uC544\uB3C4 \uC88B\uC544\uC694.", autoFocus: true, value: answers[q.id] || "", onChange: (e) => {
                            setAnswers({ ...answers, [q.id]: e.target.value });
                            if (skips[q.id])
                                setSkips({ ...skips, [q.id]: false });
                        }, rows: 4 }, q.id), _jsx("div", { className: "q-progress", "aria-label": `${qIdx + 1} / ${step.questions.length}`, children: step.questions.map((_, i) => (_jsx("i", { className: i < qIdx ? "is-done" : i === qIdx ? "is-curr" : "" }, i))) })] }), _jsxs("div", { className: "stage-actions", children: [_jsxs("button", { className: "btn-ghost", type: "button", onClick: () => go(-1), children: ["\u2190 ", qIdx === 0 ? "설명 다시 보기" : "이전 질문"] }), _jsx("span", { className: "grow" }), _jsx("button", { className: "btn-text", type: "button", onClick: skip, children: "\uBAA8\uB974\uACA0\uC5B4\uC694" }), _jsxs("button", { className: "btn-holo", type: "button", onClick: () => go(1), disabled: !filled, children: [isLast
                                ? stepIdx === STEPS.length - 1
                                    ? "학습 마치기"
                                    : "다음 개념으로"
                                : "다음 질문", " ", "\u2192"] })] })] }));
}
