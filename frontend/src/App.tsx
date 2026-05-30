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
import { loadSession, persistSession, sessionKey } from "./state/sessionPersist";
import { listSessions, removeSessionMeta, type SessionMeta } from "./state/sessionIndex";
import type { SessionState } from "./state/sessionState";
import { useDebouncedPersist } from "./state/useDebouncedPersist";

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
  const [sessions, setSessions] = useState<SessionMeta[]>(() => listSessions());

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

  const buildSnapshot = (): SessionState => ({
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
  });

  // answers 디바운스 hook. 즉시 effect 에서 cancelPending() 으로 보류분을 취소한다.
  const { cancelPending } = useDebouncedPersist(answers, buildSnapshot, (snap) => {
    try {
      persistSession(snap);
    } catch {
      // 무시
    }
    setSessions(listSessions());
  });

  // 즉시 persist: answers 외 모든 상태 변경. pending 디바운스가 있다면 cancel
  // 하고 현재 snapshot(= 최신 answers 포함)으로 곧장 저장한다.
  useEffect(() => {
    cancelPending();
    const snapshot = buildSnapshot();
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionIdRef.current);
      // input 단계(= "학습 시작" 전)는 본문 초안만 보관하고 히스토리 인덱스에는 등록하지 않는다.
      persistSession(snapshot, undefined, { index: stage !== "input" });
    } catch {
      // 저장 실패(용량 초과 등) 복구는 별도 책임이므로 여기서는 무시한다.
    }
    setSessions(listSessions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, depth, concept, materials, probes, estimatedLevel, stepIdx, skips, loaded]);

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

  /**
   * 세션을 전환한다. 현재 학습 상태를 persistSession 으로 저장한 뒤
   * sessionIdRef/createdAtRef 를 targetId 의 메타로 갱신하고,
   * loadSession(targetId) 결과로 학습 상태 전체를 복원한다.
   * ref 갱신 패턴은 newSession/deleteSession 과 동일하게 유지한다(structural-cohesion).
   */
  const switchSession = (targetId: string) => {
    if (targetId === sessionIdRef.current) return;
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
    };
    try {
      // 떠나는 세션이 아직 input 초안이면 히스토리 인덱스에 등록하지 않는다.
      persistSession(snapshot, undefined, { index: stage !== "input" });
    } catch {
      // 저장 실패 복구는 별도 책임이므로 여기서는 무시한다.
    }

    const target = loadSession(targetId);
    sessionIdRef.current = targetId;
    createdAtRef.current = target?.createdAt ?? Date.now();
    setStage(target?.stage ?? "input");
    setDepth(target?.depth ?? "0depth");
    setConcept(target?.concept ?? "");
    setMaterials(target?.materials ?? "");
    setProbes(target?.probes ?? {});
    setEstimatedLevel(target?.estimatedLevel ?? null);
    setStepIdx(target?.stepIdx ?? 0);
    setAnswers(target?.answers ?? {});
    setSkips(target?.skips ?? {});
    lastLoadedLevelRef.current = null;
    resetContent();
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, targetId);
    } catch {
      // 활성 키 기록 실패는 무시한다.
    }
    setSessions(listSessions());
  };

  /**
   * 세션을 삭제한다. 인덱스 메타(removeSessionMeta)와 본문 키(sessionKey)를 모두 제거하고,
   * 삭제 대상이 현재 활성 세션이면 새 sessionId 를 발급한 뒤 input 단계의 빈 세션으로 초기화한다.
   * ref 갱신 패턴은 newSession 과 동일하게 유지한다(structural-cohesion).
   */
  const deleteSession = (id: string) => {
    try {
      removeSessionMeta(id);
      localStorage.removeItem(sessionKey(id));
    } catch {
      // 삭제 실패 복구는 별도 책임이므로 여기서는 무시한다.
    }
    if (id === sessionIdRef.current) {
      sessionIdRef.current = createSessionId();
      createdAtRef.current = Date.now();
      setStage("input");
      setStepIdx(0);
      setProbes({});
      setEstimatedLevel(null);
      setAnswers({});
      setSkips({});
      setConcept("");
      setMaterials("");
      lastLoadedLevelRef.current = null;
      resetContent();
    }
    setSessions(listSessions());
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
        sessions={sessions}
        activeSessionId={sessionIdRef.current}
        onSelectSession={switchSession}
        onDeleteSession={deleteSession}
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
