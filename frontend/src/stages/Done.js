import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { LEVEL_LABELS, STEPS } from "./data";
import { StageShell } from "./StageShell";
import { submitAnswers, AnswersSubmissionError } from "../api/answers";
import { describeErrorCode } from "../lib/errors";
export function StageDone({ concept, level, answers, skips, onPrev, onRestart }) {
    const allQuestions = STEPS.flatMap((s) => s.questions);
    const answered = allQuestions.filter((q) => (answers[q.id] || "").trim().length > 0).length;
    const skipped = allQuestions.filter((q) => skips[q.id]).length;
    const [submitState, setSubmitState] = useState("idle");
    const [submitMsg, setSubmitMsg] = useState("");
    const [receivedCount, setReceivedCount] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const items = allQuestions
            .map((q) => {
            const ans = (answers[q.id] || "").trim();
            const unknown = !!skips[q.id];
            if (!ans && !unknown)
                return null;
            return {
                questionId: q.id,
                question: q.q,
                answer: ans || undefined,
                unknown,
            };
        })
            .filter((x) => x !== null);
        if (!items.length) {
            setSubmitState("idle");
            return;
        }
        setSubmitState("loading");
        submitAnswers({ concept, answers: items })
            .then((res) => {
            if (cancelled)
                return;
            setSubmitState("ok");
            setSubmitMsg(res.message);
            setReceivedCount(res.receivedCount);
        })
            .catch((e) => {
            if (cancelled)
                return;
            setSubmitState("error");
            if (e instanceof AnswersSubmissionError) {
                setSubmitMsg(describeErrorCode(e.code, e.message));
            }
            else {
                setSubmitMsg(e?.message ?? "답변 제출 실패");
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return (_jsx(StageShell, { eyebrow: "\uC644\uB8CC", title: _jsx(_Fragment, { children: "\uC798 \uB9C8\uCCE4\uC5B4\uC694" }), sub: `${concept} · ${STEPS.length}개 개념을 모두 마쳤습니다`, prev: onPrev, prevLabel: "\uB9C8\uC9C0\uB9C9 \uB2F5\uBCC0 \uB2E4\uC2DC \uBCF4\uAE30", next: onRestart, nextLabel: "\uC0C8 \uAC1C\uB150 \uC2DC\uC791 \u2192", children: _jsxs("div", { className: "done-card", children: [_jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uC2DC\uC791 \uC218\uC900" }), _jsxs("span", { className: "done-v", children: ["L", level ?? "-", " \u00B7 ", LEVEL_LABELS[level ?? 2]] })] }), _jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uB2F5\uBCC0" }), _jsxs("span", { className: "done-v", children: [answered, " / ", allQuestions.length, " \uBB38\uD56D"] })] }), _jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uBAA8\uB974\uACA0\uC5B4\uC694" }), _jsxs("span", { className: "done-v", children: [skipped, " \uBB38\uD56D \u00B7 \uB2E4\uC74C \uD559\uC2B5\uC5D0\uC11C \uB2E4\uC2DC \uB9CC\uB098\uC694"] })] }), _jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uC11C\uBC84 \uC804\uC1A1" }), _jsxs("span", { className: "done-v", children: [submitState === "loading" && "전송 중…", submitState === "ok" &&
                                    `${receivedCount ?? 0}건 수신 · ${submitMsg || "성공"}`, submitState === "error" && `실패 · ${submitMsg}`, submitState === "idle" && "전송할 답변이 없어요"] })] })] }) }));
}
