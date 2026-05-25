import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Sidebar } from "./components/Sidebar";
import { ProgressBar } from "./components/ProgressBar";
import { Hero } from "./components/Hero";
import { I } from "./components/icons";
import {
  ACCENT_PRESETS,
  SAMPLE_CONCEPT,
  type ProbeAnswers,
  type Stage,
} from "./stages/data";
import { StageProbe } from "./stages/Probe";
import { StageLearn } from "./stages/Learn";
import { StageDone } from "./stages/Done";
import { LearnContentProvider, useLearnContent } from "./state/LearnContent";

type AccentVars = CSSProperties & {
  "--holo"?: string;
  "--aurora-a"?: string;
  "--aurora-b"?: string;
  "--aurora-c"?: string;
};

function AppInner() {
  const [stage, setStage] = useState<Stage>("input");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [depth, setDepth] = useState<string>("0depth");
  const [accent] = useState<string[]>(ACCENT_PRESETS[0]);
  const showAurora = true;

  const [concept, setConcept] = useState<string>(SAMPLE_CONCEPT);
  const [materials, setMaterials] = useState<string>("");
  const [probes, setProbes] = useState<ProbeAnswers>({});
  const [estimatedLevel, setEstimatedLevel] = useState<number | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skips, setSkips] = useState<Record<string, boolean>>({});

  const {
    steps,
    probeStatus,
    loadProbe,
    loadOutline,
    reset: resetContent,
  } = useLearnContent();

  useEffect(() => {
    if (stage === "probe" && probeStatus === "idle") {
      void loadProbe(concept, materials);
    }
  }, [stage, probeStatus, concept, materials, loadProbe]);

  const lastLoadedLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (
      stage === "learn" &&
      estimatedLevel != null &&
      lastLoadedLevelRef.current !== estimatedLevel
    ) {
      lastLoadedLevelRef.current = estimatedLevel;
      void loadOutline(concept, estimatedLevel);
    }
  }, [stage, estimatedLevel, concept, loadOutline]);

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

  const newSession = (suggestedConcept?: string) => {
    setStage("input");
    setStepIdx(0);
    setProbes({});
    setEstimatedLevel(null);
    setAnswers({});
    setSkips({});
    lastLoadedLevelRef.current = null;
    resetContent();
    if (typeof suggestedConcept === "string" && suggestedConcept.trim()) {
      setConcept(suggestedConcept.trim());
      setMaterials("");
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
              materials={materials}
              setMaterials={setMaterials}
              onStart={() => setStage("probe")}
            />
          )}

          {stage === "probe" && (
            <StageProbe
              concept={concept}
              materials={materials}
              probes={probes}
              setProbes={(updater) => setProbes((prev) => updater(prev))}
              setEstimatedLevel={setEstimatedLevel}
              onPrev={() => setStage("input")}
              onNext={() => {
                setStepIdx(0);
                setStage("learn");
              }}
              onRetreat={(suggestedConcept) => newSession(suggestedConcept)}
              onRetry={() => loadProbe(concept, materials)}
            />
          )}

          {stage === "learn" && (
            <StageLearn
              concept={concept}
              level={estimatedLevel}
              stepIdx={stepIdx}
              setStepIdx={setStepIdx}
              answers={answers}
              setAnswers={setAnswers}
              skips={skips}
              setSkips={setSkips}
              onPrev={() => setStage("probe")}
              onDone={() => setStage("done")}
              onRetry={() => {
                if (estimatedLevel != null) {
                  lastLoadedLevelRef.current = null;
                  void loadOutline(concept, estimatedLevel);
                }
              }}
            />
          )}

          {stage === "done" && (
            <StageDone
              concept={concept}
              level={estimatedLevel}
              answers={answers}
              skips={skips}
              onPrev={() => {
                setStepIdx(Math.max(0, steps.length - 1));
                setStage("learn");
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

export default function App() {
  return (
    <LearnContentProvider>
      <AppInner />
    </LearnContentProvider>
  );
}
