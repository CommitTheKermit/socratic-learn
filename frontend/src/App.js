import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ProgressBar } from "./components/ProgressBar";
import { Hero } from "./components/Hero";
import { I } from "./components/icons";
import { ACCENT_PRESETS, SAMPLE_CONCEPT, } from "./stages/data";
import { StageProbe } from "./stages/Probe";
import { StageLearn } from "./stages/Learn";
import { StageDone } from "./stages/Done";
import { LearnContentProvider, useLearnContent } from "./state/LearnContent";
function AppInner() {
    const [stage, setStage] = useState("input");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [depth, setDepth] = useState("0depth");
    const [accent] = useState(ACCENT_PRESETS[0]);
    const showAurora = true;
    const [concept, setConcept] = useState(SAMPLE_CONCEPT);
    const [probes, setProbes] = useState({});
    const [estimatedLevel, setEstimatedLevel] = useState(null);
    const [stepIdx, setStepIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [skips, setSkips] = useState({});
    const { steps, probeStatus, loadProbe, loadOutline, reset: resetContent, } = useLearnContent();
    useEffect(() => {
        if (stage === "probe" && probeStatus === "idle") {
            void loadProbe(concept);
        }
    }, [stage, probeStatus, concept, loadProbe]);
    const lastLoadedLevelRef = useRef(null);
    useEffect(() => {
        if (stage === "learn" &&
            estimatedLevel != null &&
            lastLoadedLevelRef.current !== estimatedLevel) {
            lastLoadedLevelRef.current = estimatedLevel;
            void loadOutline(concept, estimatedLevel);
        }
    }, [stage, estimatedLevel, concept, loadOutline]);
    const accentStyle = useMemo(() => {
        const colors = Array.isArray(accent) ? accent : ACCENT_PRESETS[0];
        const stops = colors.length === 1 ? `${colors[0]}, ${colors[0]}` : colors.join(", ");
        const a = colors[0] || "#A8FFC9";
        const b = colors[Math.floor(colors.length / 2)] || "#7DE3FF";
        const c = colors[colors.length - 1] || "#FFB3D9";
        return {
            "--holo": `linear-gradient(135deg, ${stops})`,
            "--aurora-a": a,
            "--aurora-b": b,
            "--aurora-c": c,
        };
    }, [accent]);
    const newSession = () => {
        setStage("input");
        setStepIdx(0);
        setProbes({});
        setEstimatedLevel(null);
        setAnswers({});
        setSkips({});
        lastLoadedLevelRef.current = null;
        resetContent();
    };
    return (_jsxs("div", { className: "app", "data-sidebar": sidebarCollapsed ? "collapsed" : "open", "data-stage": stage, style: accentStyle, children: [_jsx(Sidebar, { stage: stage, concept: concept, onNewSession: newSession, onToggleCollapse: () => setSidebarCollapsed((v) => !v) }), _jsxs("main", { className: "main", children: [showAurora && (_jsx("div", { className: "aurora", "aria-hidden": true, children: _jsx("div", { className: "vignette" }) })), stage !== "input" && _jsx(ProgressBar, { stage: stage, stepIdx: stepIdx }), _jsxs("div", { className: "main-inner", children: [stage === "input" && (_jsx(Hero, { depth: depth, onDepth: setDepth, concept: concept, setConcept: setConcept, onStart: () => setStage("probe") })), stage === "probe" && (_jsx(StageProbe, { concept: concept, probes: probes, setProbes: (updater) => setProbes((prev) => updater(prev)), setEstimatedLevel: setEstimatedLevel, onPrev: () => setStage("input"), onNext: () => {
                                    setStepIdx(0);
                                    setStage("learn");
                                }, onRetry: () => loadProbe(concept) })), stage === "learn" && (_jsx(StageLearn, { concept: concept, level: estimatedLevel, stepIdx: stepIdx, setStepIdx: setStepIdx, answers: answers, setAnswers: setAnswers, skips: skips, setSkips: setSkips, onPrev: () => setStage("probe"), onDone: () => setStage("done"), onRetry: () => {
                                    if (estimatedLevel != null) {
                                        lastLoadedLevelRef.current = null;
                                        void loadOutline(concept, estimatedLevel);
                                    }
                                } })), stage === "done" && (_jsx(StageDone, { concept: concept, level: estimatedLevel, answers: answers, skips: skips, onPrev: () => {
                                    setStepIdx(Math.max(0, steps.length - 1));
                                    setStage("learn");
                                }, onRestart: newSession }))] }), stage === "input" && (_jsx("div", { className: "brand-badge", "aria-label": "Socratic", children: I.brand }))] })] }));
}
export default function App() {
    return (_jsx(LearnContentProvider, { children: _jsx(AppInner, {}) }));
}
