import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
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
import { loadSession, sessionKey } from "./state/sessionPersist";
import { listSessions, removeSessionMeta, type SessionMeta } from "./state/sessionIndex";
import type { SessionState } from "./state/sessionState";
import {
  fetchAndMerge,
  fetchRemoteSessionList,
  mergeSessionLists,
  persistWithSync,
} from "./state/sessionSync";
import { useDebouncedPersist } from "./state/useDebouncedPersist";
import { useAuth } from "./state/useAuth";

type AccentVars = CSSProperties & {
  "--holo"?: string;
  "--aurora-a"?: string;
  "--aurora-b"?: string;
  "--aurora-c"?: string;
};

/** 마지막으로 활성화된 세션 id. 루트("/") 재접속 시 그 세션의 단계 URL 로 돌려보내는 데 쓴다. */
const ACTIVE_SESSION_KEY = "socratic:activeSessionId";
/** 홈("/") 입력 초안(concept). 아직 세션이 발급되지 않은 입력 중 내용을 새로고침 대비로 보관한다. */
const DRAFT_CONCEPT_KEY = "socratic:draft:concept";

let sessionSeq = 0;
function createSessionId(): string {
  sessionSeq += 1;
  return `s-${Date.now().toString(36)}-${sessionSeq.toString(36)}`;
}

/** stage(+stepIdx) 를 경로 문자열로 변환한다. sessionId 가 없으면 홈("/"). */
function pathFor(sessionId: string | undefined, stage: Stage, stepIdx = 0): string {
  if (!sessionId) return "/";
  if (stage === "input") return `/s/${sessionId}`;
  if (stage === "probe") return `/s/${sessionId}/probe`;
  if (stage === "learn") return `/s/${sessionId}/learn/${stepIdx}`;
  return `/s/${sessionId}/done`;
}

function readDraftConcept(): string {
  try {
    return localStorage.getItem(DRAFT_CONCEPT_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * 루트("/") 진입 시: 마지막 활성 세션이 있으면 그 세션의 단계 URL 로 redirect 해
 * 재접속 시 진행 중이던 단계를 그대로 복원한다(이미 나온 결과는 재로딩하지 않음).
 * 활성 세션이 없으면 홈(개념 입력) 화면을 보여준다.
 */
function HomeRedirect() {
  const target = useMemo(() => {
    let id: string | null = null;
    try {
      id = localStorage.getItem(ACTIVE_SESSION_KEY);
    } catch {
      id = null;
    }
    if (!id) return null;
    const s = loadSession(id);
    if (!s) return null;
    return pathFor(id, s.stage, s.stepIdx);
  }, []);
  if (target && target !== "/") return <Navigate to={target} replace />;
  return <AppShell stage="input" />;
}

/** route element. URL 의 sessionId 를 key 로 삼아 세션 전환 시 워크스페이스 전체를 재마운트한다. */
function AppShell({ stage }: { stage: Stage }) {
  const { sessionId } = useParams();
  return <AppSession key={sessionId ?? "__home__"} stage={stage} sessionId={sessionId} />;
}

/**
 * 세션 1건의 작업 공간. sessionId 가 바뀌면(=세션 전환) key 로 통째 재마운트되므로,
 * 저장된 산출물을 LearnContentProvider 의 initial 로 한 번만 주입하면 첫 렌더부터 복원된다.
 */
function AppSession({ stage, sessionId }: { stage: Stage; sessionId?: string }) {
  // 캐시 우선 렌더. 백그라운드 Firestore 병합이 캐시를 바꾸면 reloadToken 을 올려 본문을 재시드한다.
  const [reloadToken, setReloadToken] = useState(0);
  const loaded = useMemo(
    () => (sessionId ? loadSession(sessionId) : null),
    [sessionId, reloadToken],
  );
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!sessionId || syncedRef.current) return;
    syncedRef.current = true;
    void fetchAndMerge(sessionId)
      .then((merged) => {
        // 병합 결과가 캐시와 달랐을 때만(merged != null) 재마운트해 모든 상태를 다시 시드한다.
        if (merged) setReloadToken((t) => t + 1);
      })
      .catch(() => {
        // 원격 조회 실패: 캐시 렌더 유지. 다음 진입/저장 트리거에서 재시도.
      });
  }, [sessionId]);
  return (
    <LearnContentProvider
      key={reloadToken}
      initial={
        loaded
          ? {
              probeQuestions: loaded.probeQuestions,
              probeReady: loaded.probeReady,
              steps: loaded.steps,
              stepEvaluations: loaded.stepEvaluations,
            }
          : undefined
      }
    >
      <AppWorkspace stage={stage} sessionId={sessionId} loaded={loaded} />
    </LearnContentProvider>
  );
}

function AppWorkspace({
  stage,
  sessionId,
  loaded,
}: {
  stage: Stage;
  sessionId?: string;
  loaded: SessionState | null;
}) {
  const navigate = useNavigate();
  const params = useParams();
  // learn 단계의 stepIdx 는 URL 이 진실의 출처다. 그 외 단계에서는 0.
  const stepIdx =
    stage === "learn" ? Math.max(0, Number.parseInt(params.stepIdx ?? "0", 10) || 0) : 0;

  const createdAtRef = useRef(loaded?.createdAt ?? Date.now());

  const { user, loading: authLoading, login, logout } = useAuth();
  // GitHub 로그인 핸들(예: octocat). displayName(표시 이름)과 달리 User 타입에 노출되지 않아 reloadUserInfo 에서 추출한다.
  const githubId =
    (user as { reloadUserInfo?: { screenName?: string } } | null)?.reloadUserInfo
      ?.screenName ?? undefined;

  // 반응형 드로워: inline(넓음) <-> overlay(좁음). 같은 드로워의 두 컨테이너 동작.
  // matchMedia(≤1024px) 가 모드를 정한다. 넓음 = 인라인 push(grid 칸), 좁음 = 본문 위 오버레이.
  const [overlay, setOverlay] = useState(
    () => window.matchMedia("(max-width: 1024px)").matches,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia("(max-width: 1024px)").matches,
  );
  // effect/이벤트 핸들러에서 최신 값을 읽기 위한 ref 미러.
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;
  const collapsedRef = useRef(sidebarCollapsed);
  collapsedRef.current = sidebarCollapsed;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const focusOnOpenRef = useRef(false);

  // 양방향: ≤1024px 진입 시 자동 접힘, 벗어나면 자동 열림.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      setOverlay(e.matches);
      setSidebarCollapsed(e.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // focusInto: 드로워 안으로 포커스를 끌어온다(키보드/클릭). 단순 호버에서는 끌어오지 않는다.
  const openDrawer = (focusInto: boolean) => {
    focusOnOpenRef.current = focusInto;
    setSidebarCollapsed(false);
  };
  const closeDrawer = (returnFocus: boolean) => {
    setSidebarCollapsed(true);
    if (returnFocus && overlayRef.current) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };
  const closeIfOverlay = () => {
    if (overlayRef.current) closeDrawer(false);
  };
  // 커서가 드로워를 벗어나면 펼쳐진 오버레이 드로워를 다시 슬리버로 접는다.
  const handleDrawerLeave = () => {
    if (overlayRef.current && !collapsedRef.current) closeDrawer(false);
  };

  // 오버레이 열림: Esc 닫기 + 단순 포커스 트랩. 포커스는 의도적으로(클릭/키보드) 열었을 때만
  // 끌어오고 호버에서는 끌어오지 않는다.
  const drawerOpen = overlay && !sidebarCollapsed;
  useEffect(() => {
    if (!drawerOpen) return;
    const el = drawerRef.current;
    if (focusOnOpenRef.current) {
      const f0 = el?.querySelector<HTMLElement>(".sb-collapse") ?? el;
      f0?.focus?.();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer(true);
        return;
      }
      if (e.key === "Tab" && el) {
        const f = Array.from(
          el.querySelectorAll<HTMLElement>(
            'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((n) => !(n as HTMLButtonElement).disabled && n.offsetParent !== null);
        if (!f.length) return;
        const a = f[0];
        const b = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerOpen]);
  const [depth, setDepth] = useState<string>(() => loaded?.depth ?? "0depth");
  const [accent] = useState<string[]>(ACCENT_PRESETS[0]);
  const showAurora = true;

  const [concept, setConcept] = useState<string>(
    () => loaded?.concept ?? (sessionId ? "" : readDraftConcept() || SAMPLE_CONCEPT),
  );
  const [materials, setMaterials] = useState<string>(() => loaded?.materials ?? "");
  const [probes, setProbes] = useState<ProbeAnswers>(() => loaded?.probes ?? {});
  const [estimatedLevel, setEstimatedLevel] = useState<number | null>(
    () => loaded?.estimatedLevel ?? null,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() => loaded?.answers ?? {});
  const [skips, setSkips] = useState<Record<string, boolean>>(() => loaded?.skips ?? {});
  const [sessions, setSessions] = useState<SessionMeta[]>(() => listSessions());

  // 사이드바 목록을 원격과 1회 병합한다. 로컬(작업 중) 메타는 유지하고 원격 전용 세션만 추가한다.
  useEffect(() => {
    let alive = true;
    void fetchRemoteSessionList().then((remote) => {
      if (!alive || !remote.length) return;
      setSessions((local) => mergeSessionLists(local, remote));
    });
    return () => {
      alive = false;
    };
  }, []);

  const {
    steps,
    probeStatus,
    probeQuestions,
    outlineStatus,
    stepDetailStatus,
    stepEvaluations,
    loadProbe,
    loadOutline,
  } = useLearnContent();

  // probe 단계 진입 시 아직 문항이 없으면(idle) 1회 로드한다. 복원된 세션은 "ready" 로 시작하므로 재호출되지 않는다.
  useEffect(() => {
    if (stage === "probe" && probeStatus === "idle") {
      void loadProbe(concept, materials);
    }
  }, [stage, probeStatus, concept, materials, loadProbe]);

  // 복원된 steps 가 있으면 그 레벨을 이미 로드한 것으로 간주해 learn 진입 시 outline 을 재생성하지 않는다.
  const lastLoadedLevelRef = useRef<number | null>(
    loaded?.steps?.length ? loaded.estimatedLevel ?? null : null,
  );
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
    sessionId: sessionId ?? "",
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
    probeQuestions: probeStatus === "ready" ? probeQuestions : undefined,
    probeReady: probeStatus === "ready",
    steps: outlineStatus === "ready" && steps.length ? steps : undefined,
    stepEvaluations: Object.keys(stepEvaluations).length ? stepEvaluations : undefined,
  });

  // answers 디바운스 hook. 입력 완료 신호(textarea onBlur)에 flush 를 연결하고,
  // 그 사이 백업으로 3초 비활성 디바운스 저장한다. 즉시 effect 에서 cancelPending() 으로 보류분을 취소한다.
  const { cancelPending, flush } = useDebouncedPersist(
    answers,
    buildSnapshot,
    (snap) => {
      if (!sessionId) return;
      try {
        persistWithSync(snap);
      } catch {
        // 무시
      }
      setSessions(listSessions());
    },
    3000,
  );

  // 즉시 persist: answers 외 모든 상태/산출물(ready 전이) 변경 시. 홈(sessionId 없음)은 draft 만 보관한다.
  // 산출물은 deps 에 status 들만 넣어 streaming delta 마다 저장되지 않게 하고, ready 전이 시점의 최신 steps 를 담는다.
  useEffect(() => {
    if (!sessionId) {
      try {
        localStorage.setItem(DRAFT_CONCEPT_KEY, concept);
      } catch {
        // 무시
      }
      return;
    }
    cancelPending();
    const snapshot = buildSnapshot();
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
      // input 단계(= "학습 시작" 전)는 본문 초안만 보관하고 히스토리 인덱스/원격에는 올리지 않는다.
      persistWithSync(snapshot, undefined, { index: stage !== "input" });
    } catch {
      // 저장 실패(용량 초과 등) 복구는 별도 책임이므로 여기서는 무시한다.
    }
    setSessions(listSessions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionId,
    stage,
    depth,
    concept,
    materials,
    probes,
    estimatedLevel,
    stepIdx,
    skips,
    probeStatus,
    outlineStatus,
    stepDetailStatus,
    stepEvaluations,
  ]);

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

  /** 같은 세션 내 단계 이동. learn 은 stepIdx 도 URL 에 싣는다. */
  const goStage = (next: Stage, idx = 0) => {
    navigate(pathFor(sessionId, next, idx));
  };
  const setStepIdx = (n: number) => {
    if (sessionId) navigate(pathFor(sessionId, "learn", n));
  };

  /** "학습 시작": 홈이면 새 세션을 발급해 저장 후 probe 로, 기존 세션이면 그대로 probe 로 이동. */
  const startLearning = async () => {
    if (!user) {
      try {
        await login();
      } catch {
        return;
      }
    }
    if (sessionId) {
      goStage("probe");
      return;
    }
    const newId = createSessionId();
    const snap: SessionState = {
      sessionId: newId,
      createdAt: Date.now(),
      conceptSummary: concept,
      stage: "probe",
      depth,
      concept,
      materials: "",
      probes: {},
      estimatedLevel: null,
      stepIdx: 0,
      answers: {},
      skips: {},
    };
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, newId);
      localStorage.removeItem(DRAFT_CONCEPT_KEY);
      persistWithSync(snap, undefined, { index: true });
    } catch {
      // 무시
    }
    navigate(pathFor(newId, "probe"));
  };

  /** 새 세션 시작(사이드바). 활성 세션/초안을 비우고 홈으로 이동한다. */
  const newSession = (suggestedConcept?: string) => {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      if (suggestedConcept?.trim()) localStorage.setItem(DRAFT_CONCEPT_KEY, suggestedConcept.trim());
      else localStorage.removeItem(DRAFT_CONCEPT_KEY);
    } catch {
      // 무시
    }
    navigate("/");
  };

  /**
   * 사이드바에서 다른 세션 선택. 그 세션의 단계 URL 로 이동하면 key 재마운트로 산출물이 복원된다.
   * 캐시에 없는 원격 전용 세션(다기기 유입)은 먼저 Firestore 에서 받아 캐시에 채운 뒤 올바른 단계로 이동한다.
   */
  const switchSession = async (targetId: string) => {
    if (targetId === sessionId) return;
    let target = loadSession(targetId);
    if (!target) {
      try {
        await fetchAndMerge(targetId);
        target = loadSession(targetId);
      } catch {
        // 원격 조회 실패: input 으로 이동(이후 진입 시 재시도).
      }
    }
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, targetId);
    } catch {
      // 무시
    }
    navigate(pathFor(targetId, target?.stage ?? "input", target?.stepIdx ?? 0));
  };

  /** 세션 삭제. 활성 세션을 지우면 홈으로 이동한다. */
  const deleteSession = (id: string) => {
    try {
      removeSessionMeta(id);
      localStorage.removeItem(sessionKey(id));
    } catch {
      // 무시
    }
    setSessions(listSessions());
    if (id === sessionId) {
      try {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        localStorage.removeItem(DRAFT_CONCEPT_KEY);
      } catch {
        // 무시
      }
      navigate("/");
    }
  };

  return (
    <div
      className="app"
      data-sidebar={sidebarCollapsed ? "collapsed" : "open"}
      data-sidebar-mode={overlay ? "overlay" : "inline"}
      data-stage={stage}
      style={accentStyle}
    >
      <Sidebar
        drawerRef={drawerRef}
        overlay={overlay}
        open={!sidebarCollapsed}
        onNavigate={closeIfOverlay}
        onDrawerLeave={handleDrawerLeave}
        stage={stage}
        concept={concept}
        onNewSession={newSession}
        onToggleCollapse={() => closeDrawer(true)}
        sessions={sessions}
        activeSessionId={sessionId ?? ""}
        onSelectSession={switchSession}
        onDeleteSession={deleteSession}
        authPending={authLoading}
        loggedIn={!!user}
        userName={githubId ?? user?.displayName ?? user?.email ?? undefined}
        photoURL={user?.photoURL ?? undefined}
        onLogin={() => void login()}
        onLogout={() => void logout()}
      />

      {/* edge hotzone: 접힘 시 가장자리 슬리버(overlay)/그립(inline) 위에 떠서
          호버하면 오버레이를 펼치고, 클릭/키보드로 열면 포커스까지 끌어온다. */}
      <button
        ref={triggerRef}
        className="sb-edge"
        type="button"
        aria-label="사이드바 열기"
        aria-expanded={!sidebarCollapsed}
        onMouseEnter={() => {
          if (overlayRef.current) openDrawer(false);
        }}
        onClick={() => openDrawer(true)}
      >
        <span className="sb-edge-grip" aria-hidden />
      </button>

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
              onStart={startLearning}
            />
          )}

          {stage === "probe" && (
            <StageProbe
              concept={concept}
              materials={materials}
              probes={probes}
              setProbes={(updater) => setProbes((prev) => updater(prev))}
              setEstimatedLevel={setEstimatedLevel}
              onPrev={() => goStage("input")}
              onNext={() => goStage("learn", 0)}
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
              onAnswerCommit={flush}
              skips={skips}
              setSkips={setSkips}
              onPrev={() => goStage("probe")}
              onDone={() => goStage("done")}
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
              onPrev={() => goStage("learn", Math.max(0, steps.length - 1))}
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
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/s/:sessionId" element={<AppShell stage="input" />} />
      <Route path="/s/:sessionId/probe" element={<AppShell stage="probe" />} />
      <Route path="/s/:sessionId/learn/:stepIdx" element={<AppShell stage="learn" />} />
      <Route path="/s/:sessionId/done" element={<AppShell stage="done" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
