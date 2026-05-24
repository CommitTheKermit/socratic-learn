import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ProgressBar } from "./components/ProgressBar";
import { Hero } from "./components/Hero";
import { I } from "./components/icons";
import { ACCENT_PRESETS, SAMPLE_CONCEPT, STEPS, } from "./stages/data";
import { StageProbe } from "./stages/Probe";
import { StageRoadmap } from "./stages/Roadmap";
import { StageExplain } from "./stages/Explain";
import { StageQuestions } from "./stages/Questions";
import { StageAnswering } from "./stages/Answering";
import { StageDone } from "./stages/Done";
export default function App() {
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
    };
    const onStepDone = () => {
        if (stepIdx < STEPS.length - 1) {
            setStepIdx(stepIdx + 1);
            setStage("explain");
        }
        else {
            setStage("done");
        }
    };
    const onPrevFromExplain = () => {
        if (stepIdx === 0)
            setStage("roadmap");
        else {
            setStepIdx(stepIdx - 1);
            setStage("answering");
        }
    };
    return (_jsxs("div", { className: "app", "data-sidebar": sidebarCollapsed ? "collapsed" : "open", "data-stage": stage, style: accentStyle, children: [_jsx(Sidebar, { stage: stage, concept: concept, onNewSession: newSession, onToggleCollapse: () => setSidebarCollapsed((v) => !v) }), _jsxs("main", { className: "main", children: [showAurora && (_jsx("div", { className: "aurora", "aria-hidden": true, children: _jsx("div", { className: "vignette" }) })), stage !== "input" && _jsx(ProgressBar, { stage: stage, stepIdx: stepIdx }), _jsxs("div", { className: "main-inner", children: [stage === "input" && (_jsx(Hero, { depth: depth, onDepth: setDepth, concept: concept, setConcept: setConcept, onStart: () => setStage("probe") })), stage === "probe" && (_jsx(StageProbe, { concept: concept, probes: probes, setProbes: (updater) => setProbes((prev) => updater(prev)), estimatedLevel: estimatedLevel, setEstimatedLevel: setEstimatedLevel, onPrev: () => setStage("input"), onNext: () => setStage("roadmap") })), stage === "roadmap" && (_jsx(StageRoadmap, { concept: concept, level: estimatedLevel, onPrev: () => setStage("probe"), onNext: () => {
                                    setStepIdx(0);
                                    setStage("explain");
                                } })), stage === "explain" && (_jsx(StageExplain, { concept: concept, stepIdx: stepIdx, onPrev: onPrevFromExplain, onNext: () => setStage("questions") })), stage === "questions" && (_jsx(StageQuestions, { stepIdx: stepIdx, onPrev: () => setStage("explain"), onNext: () => setStage("answering") })), stage === "answering" && (_jsx(StageAnswering, { stepIdx: stepIdx, answers: answers, setAnswers: setAnswers, skips: skips, setSkips: setSkips, onPrev: () => setStage("questions"), onStepDone: onStepDone })), stage === "done" && (_jsx(StageDone, { concept: concept, level: estimatedLevel, answers: answers, skips: skips, onPrev: () => {
                                    setStepIdx(STEPS.length - 1);
                                    setStage("answering");
                                }, onRestart: newSession }))] }), stage === "input" && (_jsx("div", { className: "brand-badge", "aria-label": "Socratic", children: I.brand }))] })] }));
}
