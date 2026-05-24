import { useMemo, useState, type CSSProperties } from "react";
import { Sidebar } from "./components/Sidebar";
import { ProgressBar } from "./components/ProgressBar";
import { Hero } from "./components/Hero";
import { I } from "./components/icons";
import {
  ACCENT_PRESETS,
  SAMPLE_CONCEPT,
  STEPS,
  type ProbeAnswers,
  type Stage,
} from "./stages/data";
import { StageProbe } from "./stages/Probe";
import { StageRoadmap } from "./stages/Roadmap";
import { StageExplain } from "./stages/Explain";
import { StageQuestions } from "./stages/Questions";
import { StageAnswering } from "./stages/Answering";
import { StageDone } from "./stages/Done";

type AccentVars = CSSProperties & {
  "--holo"?: string;
  "--aurora-a"?: string;
  "--aurora-b"?: string;
  "--aurora-c"?: string;
};

export default function App() {
  const [stage, setStage] = useState<Stage>("input");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [depth, setDepth] = useState<string>("0depth");
  const [accent] = useState<string[]>(ACCENT_PRESETS[0]);
  const showAurora = true;

  const [concept, setConcept] = useState<string>(SAMPLE_CONCEPT);
  const [probes, setProbes] = useState<ProbeAnswers>({});
  const [estimatedLevel, setEstimatedLevel] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skips, setSkips] = useState<Record<string, boolean>>({});

  const accentStyle = useMemo<AccentVars>(() => {
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
    } else {
      setStage("done");
    }
  };

  const onPrevFromExplain = () => {
    if (stepIdx === 0) setStage("roadmap");
    else {
      setStepIdx(stepIdx - 1);
      setStage("answering");
    }
  };

  return (
    <div
      className="app"
      data-sidebar={sidebarCollapsed ? "collapsed" : "open"}
      data-stage={stage}
      style={accentStyle}
    >
      <Sidebar
        stage={stage}
        concept={concept}
        onNewSession={newSession}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <main className="main">
        {showAurora && (
          <div className="aurora" aria-hidden>
            <div className="vignette" />
          </div>
        )}

        {stage !== "input" && <ProgressBar stage={stage} stepIdx={stepIdx} />}

        <div className="main-inner">
          {stage === "input" && (
            <Hero
              depth={depth}
              onDepth={setDepth}
              concept={concept}
              setConcept={setConcept}
              onStart={() => setStage("probe")}
            />
          )}

          {stage === "probe" && (
            <StageProbe
              concept={concept}
              probes={probes}
              setProbes={(updater) => setProbes((prev) => updater(prev))}
              estimatedLevel={estimatedLevel}
              setEstimatedLevel={setEstimatedLevel}
              onPrev={() => setStage("input")}
              onNext={() => setStage("roadmap")}
            />
          )}

          {stage === "roadmap" && (
            <StageRoadmap
              concept={concept}
              level={estimatedLevel}
              onPrev={() => setStage("probe")}
              onNext={() => {
                setStepIdx(0);
                setStage("explain");
              }}
            />
          )}

          {stage === "explain" && (
            <StageExplain
              concept={concept}
              stepIdx={stepIdx}
              onPrev={onPrevFromExplain}
              onNext={() => setStage("questions")}
            />
          )}

          {stage === "questions" && (
            <StageQuestions
              stepIdx={stepIdx}
              onPrev={() => setStage("explain")}
              onNext={() => setStage("answering")}
            />
          )}

          {stage === "answering" && (
            <StageAnswering
              stepIdx={stepIdx}
              answers={answers}
              setAnswers={setAnswers}
              skips={skips}
              setSkips={setSkips}
              onPrev={() => setStage("questions")}
              onStepDone={onStepDone}
            />
          )}

          {stage === "done" && (
            <StageDone
              concept={concept}
              level={estimatedLevel}
              answers={answers}
              skips={skips}
              onPrev={() => {
                setStepIdx(STEPS.length - 1);
                setStage("answering");
              }}
              onRestart={newSession}
            />
          )}
        </div>

        {stage === "input" && (
          <div className="brand-badge" aria-label="Socratic">
            {I.brand}
          </div>
        )}
      </main>
    </div>
  );
}
