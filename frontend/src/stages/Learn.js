import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useLearnContent } from "../state/LearnContent";
import { Markdown } from "../lib/markdown";
import { LEVEL_LABELS } from "./data";
import { describeErrorCode } from "../lib/errors";
import { I } from "../components/icons";
const GRADE_LABEL = {
    correct: "정답",
    almost: "거의 맞음",
    partial: "부족",
    wrong: "오답",
};
export function StageLearn({ concept, level, stepIdx, setStepIdx, answers, setAnswers, skips, setSkips, onPrev, onDone, onRetry, }) {
    const { steps, outlineStatus, outlineError, stepDetailStatus, stepDetailErrors, loadStepDetail, stepEvaluations, stepEvalStatus, stepEvalErrors, submitEvaluation, } = useLearnContent();
    const safeLevel = level ?? 2;
    const step = steps[stepIdx];
    const detailStatus = stepDetailStatus[stepIdx] ?? "idle";
    const detailError = stepDetailErrors[stepIdx] ?? null;
    const evalStatus = stepEvalStatus[stepIdx] ?? "idle";
    const evalError = stepEvalErrors[stepIdx] ?? null;
    const evalResult = stepEvaluations[stepIdx];
    const isEvaluated = evalStatus === "ready" && !!evalResult;
    const isEvaluating = evalStatus === "loading";
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    const showToast = (msg) => {
        setToast(msg);
        if (toastTimerRef.current)
            window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
    };
    useEffect(() => () => {
        if (toastTimerRef.current)
            window.clearTimeout(toastTimerRef.current);
    }, []);
    useEffect(() => {
        if (outlineStatus === "ready" &&
            step &&
            (detailStatus === "idle" || (detailStatus === "ready" && !step.body))) {
            void loadStepDetail(concept, safeLevel, stepIdx);
        }
    }, [outlineStatus, stepIdx, step, detailStatus, concept, safeLevel, loadStepDetail]);
    if (outlineStatus === "loading" || outlineStatus === "idle") {
        return (_jsx("div", { className: "lv-board", children: _jsxs("div", { className: "lv-loading", children: [_jsx("span", { className: "lv-loading-dot" }), _jsx("p", { className: "stage-sub", children: "\uD559\uC2B5 \uB85C\uB4DC\uB9F5\uC744 \uAD6C\uC131\uD558\uACE0 \uC788\uC5B4\uC694\u2026" })] }) }));
    }
    if (outlineStatus === "error") {
        return (_jsx("div", { className: "lv-board", children: _jsxs("div", { className: "probe-result lv-status", role: "alert", children: [_jsx("div", { className: "pr-head", children: _jsx("span", { className: "pr-eyebrow", children: "\uB85C\uB4DC\uB9F5 \uC0DD\uC131 \uC2E4\uD328" }) }), _jsx("p", { className: "pr-reason", children: outlineError ? describeErrorCode(outlineError.code, outlineError.message) : "알 수 없는 오류" }), _jsx("button", { className: "btn-ghost", type: "button", onClick: onRetry, children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] }) }));
    }
    const goPrev = () => {
        if (stepIdx === 0)
            onPrev();
        else
            setStepIdx(stepIdx - 1);
    };
    const goNext = () => {
        if (!isEvaluated) {
            showToast("답변 제출이 필요합니다");
            return;
        }
        if (stepIdx >= steps.length - 1)
            onDone();
        else
            setStepIdx(stepIdx + 1);
    };
    const skipStep = () => {
        if (isEvaluated)
            return;
        const nextSkips = { ...skips };
        for (const q of step?.questions ?? [])
            nextSkips[q.id] = true;
        setSkips(nextSkips);
    };
    const submitAnswers = () => {
        if (!step || isEvaluating || isEvaluated)
            return;
        void submitEvaluation(concept, safeLevel, stepIdx, answers, skips);
    };
    const detailLoading = detailStatus === "loading" || detailStatus === "idle";
    const detailErrored = detailStatus === "error";
    const gradeFor = (qid) => evalResult?.evaluations.find((e) => e.id === qid);
    return (_jsxs("div", { className: "lv-board", children: [_jsxs("header", { className: "lv-bar", children: [_jsxs("div", { className: "lv-bar-top", children: [_jsx("span", { className: "lv-bar-eyebrow", children: "\uD559\uC2B5 \uC9C4\uD589" }), _jsx("span", { className: "lv-bar-title", children: concept }), _jsx("span", { className: "lv-bar-spacer" }), _jsxs("span", { className: "lv-bar-meta", children: ["\uAC1C\uB150 ", Math.min(stepIdx + 1, Math.max(steps.length, 1)), "/", steps.length, " \u00B7 ", LEVEL_LABELS[safeLevel]] })] }), _jsx("ol", { className: "lv-steps", children: steps.map((s, i) => (_jsx("li", { className: "lv-step" +
                                (i === stepIdx ? " is-curr" : "") +
                                (i < stepIdx ? " is-done" : ""), children: _jsxs("button", { type: "button", onClick: () => setStepIdx(i), children: [_jsx("span", { className: "lv-step-num", children: String(i + 1).padStart(2, "0") }), _jsx("span", { className: "lv-step-title", children: s.title })] }) }, s.id))) })] }), step && (_jsxs("div", { className: "lv-body lv2-body", children: [_jsx("div", { className: "lv2-left", children: _jsxs("div", { className: "lv2-left-inner", children: [_jsx("span", { className: "lv2-eyebrow", children: "\uAC1C\uB150 \uC124\uBA85" }), _jsx("h3", { children: step.title }), _jsx("p", { className: "lv2-sub", children: step.desc }), detailLoading && (_jsxs("div", { className: "lv-loading lv-loading-inline", children: [_jsx("span", { className: "lv-loading-dot" }), _jsx("p", { className: "stage-sub", children: "\uAC1C\uB150 \uC124\uBA85\uC744 \uC0DD\uC131\uD558\uACE0 \uC788\uC5B4\uC694\u2026" })] })), detailErrored && detailError && (_jsxs("div", { className: "probe-result", role: "alert", children: [_jsx("p", { className: "pr-reason", children: describeErrorCode(detailError.code, detailError.message) }), _jsx("button", { className: "btn-ghost", type: "button", onClick: () => loadStepDetail(concept, safeLevel, stepIdx), children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })), !detailLoading && !detailErrored && step.body && _jsx(Markdown, { text: step.body })] }) }), _jsxs("div", { className: "lv2-right", children: [_jsxs("div", { className: "lv2-right-head", children: [_jsx("span", { className: "label", children: "\uD655\uC778 \uC9C8\uBB38" }), _jsx("span", { className: "count", children: detailLoading ? "..." : `${step.questions.length}문항` })] }), evalStatus === "error" && evalError && (_jsxs("div", { className: "probe-result", role: "alert", children: [_jsx("p", { className: "pr-reason", children: describeErrorCode(evalError.code, evalError.message) }), _jsx("button", { className: "btn-ghost", type: "button", onClick: () => submitEvaluation(concept, safeLevel, stepIdx, answers, skips), children: "\uB2E4\uC2DC \uC2DC\uB3C4" })] })), detailLoading && (_jsxs("div", { className: "lv-loading lv-loading-inline", children: [_jsx("span", { className: "lv-loading-dot" }), _jsx("p", { className: "stage-sub", children: "\uD655\uC778 \uC9C8\uBB38\uC744 \uB9CC\uB4E4\uACE0 \uC788\uC5B4\uC694\u2026" })] })), !detailLoading &&
                                step.questions.map((q, i) => {
                                    const val = answers[q.id] || "";
                                    const isSkipped = !!skips[q.id];
                                    const ev = gradeFor(q.id);
                                    const locked = isEvaluated;
                                    return (_jsxs("div", { className: "qa-pair" +
                                            (isSkipped ? " is-skipped" : "") +
                                            (ev ? ` is-graded grade-${ev.grade}` : ""), children: [_jsxs("div", { className: "qa-head", children: [_jsxs("span", { className: "qa-num", children: ["Q", i + 1] }), _jsx("span", { className: "qa-question", children: q.q }), ev && !isSkipped && (_jsx("span", { className: `grade-badge grade-${ev.grade}`, children: GRADE_LABEL[ev.grade] })), !ev && _jsxs("span", { className: "qa-hint", children: ["\uD78C\uD2B8 - ", q.hint] })] }), _jsx("textarea", { className: "qa-answer", placeholder: "\uC790\uC720\uB86D\uAC8C \uC801\uC5B4\uC8FC\uC138\uC694. \uC9E7\uC544\uB3C4 \uC88B\uC544\uC694.", value: val, readOnly: locked, onChange: (e) => {
                                                    if (locked)
                                                        return;
                                                    setAnswers({ ...answers, [q.id]: e.target.value });
                                                    if (isSkipped)
                                                        setSkips({ ...skips, [q.id]: false });
                                                } }), ev && !isSkipped && (_jsxs("div", { className: "qa-feedback", children: [_jsx("span", { className: "qa-feedback-label", children: "AI \uD53C\uB4DC\uBC31" }), _jsx("p", { children: ev.feedback })] })), _jsx("div", { className: "qa-foot", children: _jsxs("span", { className: "qa-count", children: [val.length, "\uC790", isSkipped ? " · 건너뜀" : ""] }) })] }, q.id));
                                }), !detailLoading && (_jsx("div", { className: "lv2-right-sticky-bottom", children: _jsxs("button", { className: "lv-btn-holo lv-submit", type: "button", onClick: submitAnswers, disabled: isEvaluating || isEvaluated, children: [_jsx("span", { className: "lv-submit-icon", "aria-hidden": true, children: I.brand }), isEvaluating ? "평가 중…" : isEvaluated ? "평가 완료" : "답변 제출하기"] }) }))] })] })), _jsxs("div", { className: "lv-foot", children: [_jsxs("button", { className: "lv-btn-ghost", type: "button", onClick: goPrev, children: ["\u2190 ", stepIdx === 0 ? "수준 확인 다시 보기" : "이전 개념"] }), _jsx("span", { className: "grow" }), _jsx("button", { className: "lv-btn-ghost", type: "button", onClick: skipStep, disabled: detailLoading || isEvaluated || isEvaluating, children: "\uBAA8\uB974\uACA0\uC5B4\uC694 (\uC804\uCCB4 \uAC74\uB108\uB700)" }), _jsxs("button", { className: "lv-btn-holo", type: "button", onClick: goNext, disabled: detailLoading || isEvaluating, children: [stepIdx >= steps.length - 1 ? "학습 마치기" : "다음 개념", " \u2192"] })] }), toast && _jsx("div", { className: "lv-toast", role: "status", children: toast })] }));
}
