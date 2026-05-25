import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { LEVEL_LABELS } from "./data";
import { StageShell } from "./StageShell";
import { useLearnContent } from "../state/LearnContent";
export function StageDone({ concept, level, answers, skips, onPrev, onRestart }) {
    const { steps } = useLearnContent();
    const allQuestions = steps.flatMap((s) => s.questions);
    const answered = allQuestions.filter((q) => (answers[q.id] || "").trim().length > 0).length;
    const skipped = allQuestions.filter((q) => skips[q.id]).length;
    return (_jsx(StageShell, { eyebrow: "\uC644\uB8CC", title: _jsx(_Fragment, { children: "\uC798 \uB9C8\uCCE4\uC5B4\uC694" }), sub: `${concept} · ${steps.length}개 개념을 모두 마쳤습니다`, prev: onPrev, prevLabel: "\uB9C8\uC9C0\uB9C9 \uB2F5\uBCC0 \uB2E4\uC2DC \uBCF4\uAE30", next: onRestart, nextLabel: "\uC0C8 \uAC1C\uB150 \uC2DC\uC791 \u2192", children: _jsxs("div", { className: "done-card", children: [_jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uC2DC\uC791 \uC218\uC900" }), _jsxs("span", { className: "done-v", children: ["L", level ?? "-", " \u00B7 ", LEVEL_LABELS[level ?? 2]] })] }), _jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uB2F5\uBCC0" }), _jsxs("span", { className: "done-v", children: [answered, " / ", allQuestions.length, " \uBB38\uD56D"] })] }), _jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uBAA8\uB974\uACA0\uC5B4\uC694" }), _jsxs("span", { className: "done-v", children: [skipped, " \uBB38\uD56D \u00B7 \uB2E4\uC74C \uD559\uC2B5\uC5D0\uC11C \uB2E4\uC2DC \uB9CC\uB098\uC694"] })] }), _jsxs("div", { className: "done-row", children: [_jsx("span", { className: "done-k", children: "\uC800\uC7A5" }), _jsx("span", { className: "done-v", children: "\uB85C\uCEEC \uC804\uC6A9 (\uC11C\uBC84 \uBBF8\uC0AC\uC6A9)" })] })] }) }));
}
