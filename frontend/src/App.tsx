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
import { loadSession, persistSession } from "./state/sessionPersist";
import type { SessionState } from "./state/sessionState";

type AccentVars = CSSProperties & {
  "--holo"?: string;
  "--aurora-a"?: string;
  "--aurora-b"?: string;
  "--aurora-c"?: string;
};

/** 현재 활성 세션 id 를 가리키는 localStorage 키. 마운트 시 어떤 세션을 load 할지 결정한다. */
const ACTIVE_SESSION_KEY = "socratic:activeSessionId";

let sessionSeq = 0;
function createSessionId(): string {
  sessionSeq += 1;
  return `s-${Date.now().toString(36)}-${sessionSeq.toString(36)}`;
}

/**
 * 마운트 시점의 초기 세션을 해석한다.
 * 활성 세션 id 가 있으면 load 하여 복원하고, 없으면 새 세션 id 를 만든다.
 */
function resolveInitialSession(): {
  id: string;
  createdAt: number;
  loaded: SessionState | null;
} {
  let id: string | null = null;
  try {
    id = localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    id = null;
  }
  if (id) {
    const loaded = loadSession(id);
    return { id, createdAt: loaded?.createdAt ?? Date.now(), loaded };
  }
  return { id: createSessionId(), createdAt: Date.now(), loaded: null };
}

function AppInner() {
  const initialRef = useRef<ReturnType<typeof resolveInitialSession> | null>(null);
  if (initialRef.current === null) initialRef.current = resolveInitialSession();
  const initial = initialRef.current;
  const sessionIdRef = useRef(initial.id);
  const createdAtRef = useRef(initial.createdAt);
  const loaded = initial.loaded;

  const [stage, setStage] = useState<Stage>(() => loaded?.stage ?? "input");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [depth, setDepth] = useState<string>(() => loaded?.depth ?? "0depth");
  const [accent] = useState<string[]>(ACCENT_PRESETS[0]);
  const showAurora = true;

  const [concept, setConcept] = useState<string>(() => loaded?.concept ?? SAMPLE_CONCEPT);
  const [materials, setMaterials] = useState<string>(() => loaded?.materials ?? "");
  const [probes, setProbes] = useState<ProbeAnswers>(() => loaded?.probes ?? {});
  const [estimatedLevel, setEstimatedLevel] = useState<number | null>(
    () => loaded?.estimatedLevel ?? null,
  );
  const [stepIdx, setStepIdx] = useState(() => loaded?.stepIdx ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => loaded?.answers ?? {});
  const [skips, setSkips] = useState<Record<string, boolean>>(() => loaded?.skips ?? {});

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

  // 상태가 바뀔 때마다(마운트 포함) 현재 학습 상태를 활성 세션 키로 persist 한다.
  useEffect(() => {
    const snapshot: SessionState = {
      sessionId: sessionIdRef.current,
      createdAt: createdAtRef.current,
      conceptSummary: concept,
      stage,
      depth,
      concept,
      materials,
      probes,
      estimatedLevel,
      stepIdx,
      answers,
      skips,
      explainStreamComplete: loaded?.explainStreamComplete ?? false,
    };
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current);
      persistSession(snapshot);
    } catch {
      // 저장 실패(용량 초과 등) 복구는 별도 책임이므로 여기서는 무시한다.
    }
  }, [stage, depth, concept, materials, probes, estimatedLevel, stepIdx, answers, skips, loaded]);

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
    sessionIdRef.current = createSessionId();
    createdAtRef.current = Date.now();
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
