import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { PROBE_QUESTIONS as FALLBACK_PROBES, } from "../stages/data";
import { ClaudeContentError, generateAnswerEvaluation, generateProbeQuestions, generateRoadmapOutline, generateStepDetail, } from "../api/claudeContent";
const Ctx = createContext(null);
function toErr(e) {
    return e instanceof ClaudeContentError
        ? { code: e.code, message: e.message }
        : { code: "INTERNAL_ERROR", message: e.message };
}
export function LearnContentProvider({ children }) {
    const [probeQuestions, setProbeQuestions] = useState(FALLBACK_PROBES);
    const [probeStatus, setProbeStatus] = useState("idle");
    const [probeError, setProbeError] = useState(null);
    const [probeFromFallback, setProbeFromFallback] = useState(false);
    const [steps, setStepsState] = useState([]);
    const stepsRef = useRef([]);
    const setSteps = useCallback((updater) => {
        setStepsState((cur) => {
            const next = typeof updater === "function" ? updater(cur) : updater;
            stepsRef.current = next;
            return next;
        });
    }, []);
    const [outlineStatus, setOutlineStatus] = useState("idle");
    const [outlineError, setOutlineError] = useState(null);
    const [stepDetailStatus, setStepDetailStatus] = useState({});
    const [stepDetailErrors, setStepDetailErrors] = useState({});
    const inflightRef = useRef(new Set());
    const [stepEvaluations, setStepEvaluations] = useState({});
    const [stepEvalStatus, setStepEvalStatus] = useState({});
    const [stepEvalErrors, setStepEvalErrors] = useState({});
    const evalInflightRef = useRef(new Set());
    const loadProbe = useCallback(async (concept) => {
        setProbeStatus("loading");
        setProbeError(null);
        setProbeFromFallback(false);
        try {
            const qs = await generateProbeQuestions(concept);
            setProbeQuestions(qs);
            setProbeStatus("ready");
        }
        catch (e) {
            setProbeError(toErr(e));
            setProbeQuestions(FALLBACK_PROBES);
            setProbeFromFallback(true);
            setProbeStatus("error");
        }
    }, []);
    const loadOutline = useCallback(async (concept, level) => {
        setOutlineStatus("loading");
        setOutlineError(null);
        setSteps([]);
        setStepDetailStatus({});
        setStepDetailErrors({});
        inflightRef.current.clear();
        try {
            const outline = await generateRoadmapOutline(concept, level);
            const placeholders = outline.map((o, i) => ({
                id: i + 1,
                title: o.title,
                desc: o.desc,
                body: "",
                questions: [],
            }));
            setSteps(placeholders);
            setOutlineStatus("ready");
        }
        catch (e) {
            setOutlineError(toErr(e));
            setOutlineStatus("error");
        }
    }, []);
    const loadStepDetail = useCallback(async (concept, level, stepIdx) => {
        if (inflightRef.current.has(stepIdx))
            return;
        inflightRef.current.add(stepIdx);
        setStepDetailStatus((m) => ({ ...m, [stepIdx]: "loading" }));
        setStepDetailErrors((m) => ({ ...m, [stepIdx]: null }));
        try {
            const outline = stepsRef.current.map((s) => ({ title: s.title, desc: s.desc }));
            const detail = await generateStepDetail(concept, level, outline, stepIdx);
            setSteps((cur) => cur.map((s, i) => i === stepIdx ? { ...s, body: detail.body, questions: detail.questions } : s));
            setStepDetailStatus((m) => ({ ...m, [stepIdx]: "ready" }));
        }
        catch (e) {
            setStepDetailErrors((m) => ({ ...m, [stepIdx]: toErr(e) }));
            setStepDetailStatus((m) => ({ ...m, [stepIdx]: "error" }));
        }
        finally {
            inflightRef.current.delete(stepIdx);
        }
    }, []);
    const submitEvaluation = useCallback(async (concept, level, stepIdx, answers, skips) => {
        if (evalInflightRef.current.has(stepIdx))
            return;
        const step = stepsRef.current[stepIdx];
        if (!step)
            return;
        evalInflightRef.current.add(stepIdx);
        setStepEvalStatus((m) => ({ ...m, [stepIdx]: "loading" }));
        setStepEvalErrors((m) => ({ ...m, [stepIdx]: null }));
        try {
            const items = step.questions
                .filter((q) => !skips[q.id])
                .map((q) => ({ id: q.id, q: q.q, hint: q.hint, answer: answers[q.id] || "" }));
            const evalResult = await generateAnswerEvaluation(concept, level, step.title, step.desc, step.body, items);
            setStepEvaluations((m) => ({ ...m, [stepIdx]: evalResult }));
            setStepEvalStatus((m) => ({ ...m, [stepIdx]: "ready" }));
        }
        catch (e) {
            setStepEvalErrors((m) => ({ ...m, [stepIdx]: toErr(e) }));
            setStepEvalStatus((m) => ({ ...m, [stepIdx]: "error" }));
        }
        finally {
            evalInflightRef.current.delete(stepIdx);
        }
    }, []);
    const reset = useCallback(() => {
        setProbeQuestions(FALLBACK_PROBES);
        setProbeStatus("idle");
        setProbeError(null);
        setProbeFromFallback(false);
        setSteps([]);
        setOutlineStatus("idle");
        setOutlineError(null);
        setStepDetailStatus({});
        setStepDetailErrors({});
        inflightRef.current.clear();
        setStepEvaluations({});
        setStepEvalStatus({});
        setStepEvalErrors({});
        evalInflightRef.current.clear();
    }, []);
    return (_jsx(Ctx.Provider, { value: {
            probeQuestions,
            probeStatus,
            probeError,
            probeFromFallback,
            loadProbe,
            steps,
            outlineStatus,
            outlineError,
            loadOutline,
            stepDetailStatus,
            stepDetailErrors,
            loadStepDetail,
            stepEvaluations,
            stepEvalStatus,
            stepEvalErrors,
            submitEvaluation,
            reset,
        }, children: children }));
}
export function useLearnContent() {
    const v = useContext(Ctx);
    if (!v)
        throw new Error("LearnContentProvider missing");
    return v;
}
