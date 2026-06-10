import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ProgressBar } from "./components/ProgressBar";
import { Hero } from "./components/Hero";
import { SessionLoadOverlay } from "./components/SessionLoadOverlay";
import { I } from "./components/icons";
import {
  ACCENT_PRESETS,
  type ProbeAnswers,
  type Stage,
} from "./stages/data";
import { StageProbe } from "./stages/Probe";
import { StageLearn } from "./stages/Learn";
import { StageDone } from "./stages/Done";
import { LearnContentProvider, useLearnContent } from "./state/LearnContent";
import { loadSession } from "./state/sessionPersist";
import { loadSidebarPinned, saveSidebarPinned } from "./state/sidebarSetting";
import { SessionListProvider, useSessionList } from "./state/SessionListContext";
import type { SessionState } from "./state/sessionState";
import { fetchAndMerge, persistWithSync } from "./state/sessionSync";
import { useDebouncedPersist } from "./state/useDebouncedPersist";
import { useAuth } from "./state/useAuth";
import { hasSynced, markSynced } from "./state/fetchOncePerSession";
import type { LearnMode } from "./api/contract";
import { logEvent } from "./lib/analytics";

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

/** 루트("/") 진입 시 항상 홈(개념 입력) 화면을 보여준다. 마지막 세션으로의 자동 복원은 하지 않는다. */
function Home() {
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
  useEffect(() => {
    if (!sessionId || hasSynced(sessionId)) return;
    void fetchAndMerge(sessionId)
      .then((merged) => {
        // fetch 성공 시에만 완료로 기록(실패는 다음 진입에 재시도).
        markSynced(sessionId);
        // 병합 결과가 캐시와 달랐을 때만(merged != null) 재마운트해 모든 상태를 다시 시드한다.
        if (merged) setReloadToken((t) => t + 1);
      })
      .catch(() => {
        // 원격 조회 실패: 캐시 렌더 유지. syncedSessionIds 에 추가하지 않아 다음 진입에 재시도한다.
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
  // "학습 시작" 재진입 가드(중복 세션 발급 방지).
  const startingRef = useRef(false);

  const { user, loading: authLoading, login, logout } = useAuth();
  // GitHub 로그인 핸들(예: octocat). displayName(표시 이름)과 달리 User 타입에 노출되지 않아 reloadUserInfo 에서 추출한다.
  const githubId =
    (user as { reloadUserInfo?: { screenName?: string } } | null)?.reloadUserInfo
      ?.screenName ?? undefined;

  // 드로워: 3단계 엣지-공개.
  //   hidden : 화면 밖. 왼쪽에 보이지 않는 엣지 핫존(옅은 그립). 호버 → peek.
  //   peek   : 커서가 가장자리에 머무는 동안 드로워 일부가 클릭 가능한 미리보기로 오버레이
  //            슬라이드(본문 안 밀림). 벗어나면 hidden 으로 되접힘.
  //   open   : peek 을 클릭하면 전체 슬라이드 + 고정(PIN). 이때는 본문을 사이드바 폭만큼
  //            밀어 컬럼을 가리지 않는다. 드로워 안 "숨기기" 버튼 / Esc 로 hidden 복귀.
  // pinned 는 localStorage 에 영속화해 메인/모든 단계가 같은 설정 하나를 공유한다.
  // (화면 폭과 무관하게 사용자의 선택만 따른다. peeking 은 일시적이라 저장 안 함.)
  const [pinned, setPinned] = useState(loadSidebarPinned);
  const [peeking, setPeeking] = useState(false);
  const drawerState: "hidden" | "peek" | "open" = pinned
    ? "open"
    : peeking
      ? "peek"
      : "hidden";

  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;
  const edgeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const peekOn = () => {
    if (!pinnedRef.current) setPeeking(true);
  };
  const peekOff = () => {
    if (!pinnedRef.current) setPeeking(false);
  };
  const pin = () => {
    setPinned(true);
    setPeeking(false);
    saveSidebarPinned(true);
    requestAnimationFrame(() => {
      const el = drawerRef.current;
      const f = el?.querySelector<HTMLElement>(".sb-collapse") ?? el;
      f?.focus?.();
    });
  };
  const hide = () => {
    setPinned(false);
    setPeeking(false);
    saveSidebarPinned(false);
    requestAnimationFrame(() => edgeRef.current?.focus());
  };

  // Esc 로 고정된 드로워를 닫는다(비모달 오버레이라 포커스 트랩 없음).
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pinned]);

  // 답변 모드. 입력바 드롭다운에서 고르고 세션에 영속화되어 probe/outline/stepDetail/eval 프롬프트
  // 강도와 분기 on/off 를 정한다. (probe 단계 진입 전에 확정되므로 세션 발급 시점에 스냅샷에 담긴다.)
  const [mode, setMode] = useState<string>(() => loaded?.mode ?? "socratic");
  const [accent] = useState<string[]>(ACCENT_PRESETS[0]);
  const showAurora = true;

  const [concept, setConcept] = useState<string>(
    () => loaded?.concept ?? (sessionId ? "" : readDraftConcept()),
  );
  const [materials, setMaterials] = useState<string>(() => loaded?.materials ?? "");
  const [probes, setProbes] = useState<ProbeAnswers>(() => loaded?.probes ?? {});
  const [estimatedLevel, setEstimatedLevel] = useState<number | null>(
    () => loaded?.estimatedLevel ?? null,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(() => loaded?.answers ?? {});
  const [skips, setSkips] = useState<Record<string, boolean>>(() => loaded?.skips ?? {});
  // 사이드바 세션 목록은 App 레벨 SessionListProvider(Routes 바깥)가 보유한다. 단계 전환으로
  // 이 워크스페이스가 재마운트되어도 sessions/원격 fetch 상태가 유지되어 목록이 깜빡이지 않는다.
  // 원격 fetch(user 구독)와 목록 mutation 은 Provider 가 담당하고, 여기서는 소비만 한다.
  const { sessions, upsertSession, removeSession } = useSessionList();
  // 히스토리 선택 → 세션 로딩 중 블로킹 오버레이에 표시할 세션 제목(null 이면 미표시).
  const [loadingTitle, setLoadingTitle] = useState<string | null>(null);

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
      void loadProbe(concept, materials, mode);
    }
  }, [stage, probeStatus, concept, materials, mode, loadProbe]);

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
      void loadOutline(concept, estimatedLevel, mode);
    }
  }, [stage, estimatedLevel, concept, mode, loadOutline]);

  // sl_session_start: learn 단계 진입 시 1회 계측(fire-and-forget, 예외 무시).
  // AppWorkspace 는 단계 전환 시 재마운트되므로 빈 deps [] 가 "learn 진입 1회" 를 보장한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (stage !== "learn" || !sessionId) return;
    logEvent("sl_session_start", {
      session_id: sessionId,
      concept,
      mode: mode as LearnMode,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildSnapshot = (): SessionState => ({
    sessionId: sessionId ?? "",
    createdAt: createdAtRef.current,
    conceptSummary: concept,
    stage,
    mode,
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
      upsertSession(snap);
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
      // input 단계(= "학습 시작" 전)는 본문 캐시만 보관하고 원격/히스토리에는 올리지 않는다.
      persistWithSync(snapshot, undefined, { remote: stage !== "input" });
    } catch {
      // 저장 실패(용량 초과 등) 복구는 별도 책임이므로 여기서는 무시한다.
    }
    upsertSession(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sessionId,
    stage,
    mode,
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
    if (sessionId) {
      goStage("probe");
      return;
    }
    // 재진입 가드: 빠른 더블클릭이나 로그인 팝업(await) 대기 중 재호출로
    // 세션이 두 개 발급되는 것을 막는다(성공 시 navigate 로 언마운트되어 ref 는 버려진다).
    if (startingRef.current) return;
    startingRef.current = true;
    if (!user) {
      try {
        await login();
      } catch {
        startingRef.current = false;
        return;
      }
    }
    const newId = createSessionId();
    const snap: SessionState = {
      sessionId: newId,
      createdAt: Date.now(),
      conceptSummary: concept,
      stage: "probe",
      mode,
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
      persistWithSync(snap, undefined, { remote: true });
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
  const switchSession = useCallback(async (targetId: string) => {
    if (targetId === sessionId) return;
    // 불러오는 동안 화면 전체 클릭을 막는 블로킹 오버레이를 띄운다. 캐시에 있으면
    // 거의 즉시 navigate 되어 잠깐 스쳐 지나가고, 원격 전용 세션은 fetch 동안 유지된다.
    const meta = sessions?.find((s) => s.sessionId === targetId);
    setLoadingTitle(meta?.conceptSummary ?? "");
    try {
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
    } finally {
      // navigate 시 워크스페이스가 key 재마운트되어 오버레이는 자연히 사라지지만,
      // 같은 트리가 유지되는 경로(원격 실패 등)를 위해 명시적으로 닫는다.
      setLoadingTitle(null);
    }
  }, [sessionId, navigate, sessions]);

  /**
   * 세션 삭제. 목록/본문 캐시/원격의 낙관적 제거(tombstone 차단 포함)는 Provider 의
   * removeSession 이 담당하고, 여기서는 활성 세션을 지운 경우의 라우팅(활성 키 제거 + 홈 이동)만
   * 책임진다(sessionId/navigate 의존이라 워크스페이스에 잔류).
   */
  const deleteSession = useCallback((id: string) => {
    removeSession(id);
    if (id === sessionId) {
      try {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
        localStorage.removeItem(DRAFT_CONCEPT_KEY);
      } catch {
        // 무시
      }
      navigate("/");
    }
  }, [sessionId, navigate, removeSession]);

  return (
    <div
      className="app"
      data-drawer={drawerState}
      data-stage={stage}
      style={accentStyle}
      aria-busy={loadingTitle !== null ? "true" : undefined}
    >
      <Sidebar
        drawerRef={drawerRef}
        drawerState={drawerState}
        onHide={hide}
        stage={stage}
        concept={concept}
        onNewSession={newSession}
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

      {/* edge hotzone(hidden→호버=peek) + peek catcher(peek→클릭=고정) */}
      <button
        ref={edgeRef}
        className="sb-edge"
        type="button"
        aria-label={drawerState === "peek" ? "사이드바 열기" : "사이드바 미리보기"}
        aria-expanded={pinned}
        onMouseEnter={peekOn}
        onMouseLeave={peekOff}
        onClick={pin}
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
              mode={mode}
              onMode={setMode}
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
              mode={mode}
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
                  void loadOutline(concept, estimatedLevel, mode);
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

      <SessionLoadOverlay open={loadingTitle !== null} title={loadingTitle ?? undefined} />
    </div>
  );
}

export default function App() {
  // SessionListProvider 는 Routes 바깥에 둔다. 단계 전환으로 매칭 Route(=AppShell)가 교체되어
  // 워크스페이스가 재마운트되어도 Provider 는 유지되어 사이드바 목록이 깜빡이지 않는다.
  return (
    <SessionListProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:sessionId" element={<AppShell stage="input" />} />
        <Route path="/s/:sessionId/probe" element={<AppShell stage="probe" />} />
        <Route path="/s/:sessionId/learn/:stepIdx" element={<AppShell stage="learn" />} />
        <Route path="/s/:sessionId/done" element={<AppShell stage="done" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionListProvider>
  );
}
