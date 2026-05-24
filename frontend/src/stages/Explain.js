import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { STEPS } from "./data";
import { StageShell } from "./StageShell";
import { Markdown } from "../lib/markdown";
import { startLearnStream } from "../api/learnStream";
import { describeErrorCode } from "../lib/errors";
export function StageExplain({ concept, stepIdx, onPrev, onNext }) {
    const step = STEPS[stepIdx];
    const [body, setBody] = useState("");
    const [status, setStatus] = useState("idle");
    const [errMsg, setErrMsg] = useState("");
    const abortRef = useRef(null);
    useEffect(() => {
        setBody("");
        setStatus("loading");
        setErrMsg("");
        const handle = startLearnStream({ concept: `${concept} - ${step.title}: ${step.desc}` }, {
            onStatus: () => setStatus("streaming"),
            onDelta: (e) => {
                setStatus("streaming");
                setBody((prev) => prev + e.text);
            },
            onComplete: (e) => {
                if (e.content)
                    setBody(e.content);
                setStatus("done");
            },
            onError: (e) => {
                setStatus("error");
                setErrMsg(describeErrorCode(e.code, e.message));
            },
        });
        abortRef.current = handle.abort;
        return () => {
            handle.abort();
            abortRef.current = null;
        };
    }, [concept, stepIdx, step.title, step.desc]);
    const retry = () => {
        abortRef.current?.();
        setBody("");
        setStatus("loading");
        setErrMsg("");
        const handle = startLearnStream({ concept: `${concept} - ${step.title}: ${step.desc}` }, {
            onStatus: () => setStatus("streaming"),
            onDelta: (e) => setBody((prev) => prev + e.text),
            onComplete: (e) => {
                if (e.content)
                    setBody(e.content);
                setStatus("done");
            },
            onError: (e) => {
                setStatus("error");
                setErrMsg(describeErrorCode(e.code, e.message));
            },
        });
        abortRef.current = handle.abort;
    };
    const fallback = step.body;
    const showFallback = status === "error" && !body;
    return (_jsx(StageShell, { eyebrow: `03 · 개념 설명 · 개념 ${stepIdx + 1}/${STEPS.length}`, title: step.title, sub: step.desc, prev: onPrev, prevLabel: stepIdx === 0 ? "단계 다시 보기" : "이전 개념", next: onNext, nextLabel: "\uD655\uC778 \uC9C8\uBB38 \uBCF4\uAE30 \u2192", nextDisabled: status === "loading", children: _jsxs("article", { className: "explain", children: [(status === "loading" || (status === "streaming" && !body)) && (_jsx("p", { className: "stage-sub", children: "\uC124\uBA85\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4\u2026" })), body && _jsx(Markdown, { text: body }), showFallback && (_jsxs(_Fragment, { children: [_jsx(Markdown, { text: fallback }), _jsx("p", { className: "stage-sub", children: "\uC0D8\uD50C \uC124\uBA85\uC744 \uC784\uC2DC\uB85C \uBCF4\uC5EC\uB4DC\uB838\uC5B4\uC694. \uC704 \uC624\uB958\uB97C \uD574\uACB0\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694." })] })), status === "error" && (_jsxs("div", { className: "probe-result", role: "alert", children: [_jsx("div", { className: "pr-head", children: _jsx("span", { className: "pr-eyebrow", children: "\uC124\uBA85 \uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328" }) }), _jsx("p", { className: "pr-reason", children: errMsg }), _jsx("button", { className: "btn-ghost", type: "button", onClick: retry, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }))] }) }));
}
