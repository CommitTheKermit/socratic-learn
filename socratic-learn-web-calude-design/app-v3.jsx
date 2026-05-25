// Socratic Learn — v3 main app
// Single-page state machine with per-concept (explain → questions → answering) loop.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "stage": "input",
  "sidebarCollapsed": false,
  "depth": "0depth",
  "showAurora": true,
  "accent": ["#A8FFC9", "#7DE3FF", "#C8B6FF", "#FFB3D9"]
}/*EDITMODE-END*/;

const ACCENT_PRESETS = [
  ["#A8FFC9", "#7DE3FF", "#C8B6FF", "#FFB3D9"], // Ethereal Pulse (기본)
  ["#FFD6A5", "#FFADAD", "#FFC6FF", "#BDB2FF"], // Sunset Bloom
  ["#A8FFD9", "#A0E7E5", "#B5DEFF", "#CABFFF"], // Lagoon
  ["#FFE5B4", "#FFB997", "#FF9AA2", "#FFC9DE"], // Peach
  ["#E2F89C", "#A8FFC9", "#7DE3FF", "#B6CEFA"], // Citrus Sky
  ["#FBC2EB", "#A6C1EE"],                       // Cotton
  ["#FDE68A", "#FCA5A5", "#F9A8D4"],            // Apricot
  ["#C7D2FE", "#A5F3FC", "#BBF7D0"],            // Glacier
];

const DEPTHS = [
  { value: "0depth", label: "0depth", hint: "한 줄로 핵심만" },
  { value: "1depth", label: "1depth", hint: "맥락과 흐름까지" },
  { value: "2depth", label: "2depth", hint: "깊은 원리까지" },
];

// Stages (linear). 'explain', 'questions', 'answering' are repeated per step.
const STAGE_LABELS = {
  input:     "개념 입력",
  probe:     "수준 확인",
  roadmap:   "단계 제시",
  explain:   "개념 설명",
  questions: "확인 질문",
  answering: "질문 답변",
  done:      "완료",
};
const STAGE_LIST = Object.keys(STAGE_LABELS);

// Phases for the top bar.
const PHASES = [
  { id: "probe",   label: "수준 확인" },
  { id: "roadmap", label: "단계 제시" },
  { id: "learn",   label: "학습 진행" },
  { id: "done",    label: "완료"      },
];
const LEARN_STAGES = ["explain", "questions", "answering"];

function phaseOf(stage) {
  if (LEARN_STAGES.includes(stage)) return "learn";
  if (stage === "input") return null;
  return stage;
}

// ── inline icons ──────────────────────────────────────────────────────
const Ico = ({ d, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size}
       fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const I = {
  brand:     <Ico d={<><path d="M3 12c4 0 6-3 9-3s5 3 9 3" /><path d="M3 17c4 0 6-3 9-3s5 3 9 3" /></>} />,
  sidebar:   <Ico d={<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>} />,
  capture:   <Ico d={<><path d="M5 8h2l1.5-2h7L17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3.5" /></>} />,
  archive:   <Ico d={<><rect x="3" y="4" width="18" height="4.5" rx="1.5" /><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 19.5 19V8.5" /><path d="M10 12h4" /></>} />,
  folder:    <Ico d={<><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z" /></>} />,
  history:   <Ico d={<><path d="M4 12a8 8 0 1 0 2.5-5.8L4 9" /><path d="M4 4v5h5" /><path d="M12 8v4l3 2" /></>} />,
  chevSmall: <Ico size={14} d={<><path d="m6 9 6 6 6-6" /></>} />,
  figma:     <Ico size={14} d={<><circle cx="12" cy="12" r="3" /><path d="M9 5h3v7H9a3.5 3.5 0 0 1 0-7Z" /><path d="M12 5h3a3.5 3.5 0 0 1 0 7h-3" /><path d="M12 12H9a3.5 3.5 0 0 0 0 7c2 0 3-1.5 3-3.5V12Z" /></>} />,
  image:     <Ico size={14} d={<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 5" /></>} />,
};

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ stage, concept, onNewSession }) {
  const [historyOpen, setHistoryOpen] = React.useState(true);
  const isActive = stage !== "input";

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="sb-brand-mark">{I.brand}</span>
        <span className="sb-brand-name">Socratic</span>
        <button className="sb-collapse" aria-label="사이드바 접기">{I.sidebar}</button>
      </div>

      <button
        className={"sb-item is-primary" + (stage === "input" ? " is-active" : "")}
        type="button"
        onClick={onNewSession}
      >
        <span className="ico">{I.capture}</span>
        새로 학습하기
      </button>
      <button className="sb-item" type="button">
        <span className="ico">{I.archive}</span>
        아카이브
      </button>
      <button className="sb-item" type="button">
        <span className="ico">{I.folder}</span>
        폴더
      </button>

      <div className="sb-divider" />

      <button
        className="sb-section"
        aria-expanded={historyOpen}
        onClick={() => setHistoryOpen((v) => !v)}
      >
        <span className="ico">{I.history}</span>
        학습 히스토리
        <span className="chev">{I.chevSmall}</span>
      </button>

      {historyOpen && (
        <div className="sb-history-list">
          {isActive ? (
            <button className="sb-history-item is-active" type="button">
              <span className="ti">{concept}</span>
              <span className="mt">진행 중 · {STAGE_LABELS[stage]}</span>
            </button>
          ) : (
            <div className="sb-empty">히스토리가 없습니다</div>
          )}
        </div>
      )}

      <div className="sb-spacer" />

      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-avatar">유</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-user-name">유아이볼</div>
            <div className="sb-user-meta">Free plan</div>
          </div>
        </div>
        <div className="sb-quota">
          <span className="pill">{I.figma} 10건</span>
          <span className="pill">{I.image} 50건</span>
        </div>
        <button className="sb-upgrade" type="button">플랜 업그레이드 →</button>
      </div>
    </aside>
  );
}

// ── Top progress (4-phase bar + sub progress when in learn) ───────────
function ProgressBar({ stage, stepIdx, qIdx }) {
  const currentPhase = phaseOf(stage);
  const currentPhaseIdx = PHASES.findIndex((p) => p.id === currentPhase);

  // Sub progress within "학습 진행"
  const stepsCount = STEPS.length;
  const subSlot = LEARN_STAGES.indexOf(stage); // 0,1,2 within a step
  const subDone =
    currentPhase === "learn"
      ? (stepIdx + Math.max(0, subSlot) / LEARN_STAGES.length) / stepsCount
      : currentPhase === "done" ? 1 : 0;

  return (
    <div className="phase-bar">
      {PHASES.map((p, i) => {
        const state =
          i < currentPhaseIdx ? "done" :
          i === currentPhaseIdx ? "curr" :
          "todo";
        let fillPct = 0;
        if (state === "done") fillPct = 100;
        if (state === "curr" && p.id === "learn") fillPct = subDone * 100;
        if (state === "curr" && p.id !== "learn") fillPct = 100;
        return (
          <div key={p.id} className={`pb-seg is-${state}`}>
            <span className="pb-track">
              <span className="pb-fill" style={{ width: fillPct + "%" }} />
            </span>
            <span className="pb-label">
              <span className="pb-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pb-name">{p.label}</span>
              {p.id === "learn" && state === "curr" && (
                <span className="pb-sub">
                  개념 {stepIdx + 1}/{stepsCount} · {STAGE_LABELS[stage]}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Hero (stage: input) ───────────────────────────────────────────────
function Hero({ depth, onDepth, concept, setConcept, onStart }) {
  const ref = React.useRef(null);
  const grow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(120, el.scrollHeight) + "px";
  };
  const submit = (e) => {
    e?.preventDefault?.();
    if (!concept.trim()) return;
    onStart();
  };
  return (
    <section className="hero">
      <h1>어떤 개념을<br />가장 먼저 배워볼까요?</h1>
      <p className="sub">한 줄로 입력하시면 도와드릴게요</p>

      <form className="input-bar" onSubmit={submit}>
        <label className="depth-select">
          {DEPTHS.find((d) => d.value === depth)?.label || "0depth"}
          <span className="chev">{I.chevSmall}</span>
          <select value={depth} onChange={(e) => onDepth(e.target.value)}>
            {DEPTHS.map((d) => (
              <option key={d.value} value={d.value}>{d.label} · {d.hint}</option>
            ))}
          </select>
        </label>
        <textarea
          ref={ref}
          rows={1}
          autoFocus
          placeholder="배우고 싶은 개념을 입력해서 시작해보세요"
          value={concept}
          onChange={(e) => { setConcept(e.target.value); grow(e.target); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
        />
        <button className="btn-capture" type="submit">학습 시작</button>
      </form>
    </section>
  );
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [concept, setConcept] = React.useState(SAMPLE_CONCEPT);
  const [probes, setProbes] = React.useState({});
  const [estimatedLevel, setEstimatedLevel] = React.useState(null);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState({});
  const [skips, setSkips] = React.useState({});

  const stage = t.stage;
  const setStage = (s) => setTweak("stage", s);

  // Accent → CSS vars
  const accentStyle = React.useMemo(() => {
    const colors = Array.isArray(t.accent) ? t.accent : ACCENT_PRESETS[0];
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
  }, [t.accent]);

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
    else { setStepIdx(stepIdx - 1); setStage("answering"); }
  };

  return (
    <div
      className="app"
      data-sidebar={t.sidebarCollapsed ? "collapsed" : "open"}
      data-stage={stage}
      style={accentStyle}
    >
      <Sidebar stage={stage} concept={concept} onNewSession={newSession} />

      <main className="main">
        {t.showAurora && (
          <div className="aurora" aria-hidden="true">
            <div className="vignette" />
          </div>
        )}

        {stage !== "input" && (
          <ProgressBar stage={stage} stepIdx={stepIdx} qIdx={0} />
        )}

        <div className="main-inner">
          {stage === "input" && (
            <Hero
              depth={t.depth}
              onDepth={(v) => setTweak("depth", v)}
              concept={concept}
              setConcept={setConcept}
              onStart={() => setStage("probe")}
            />
          )}

          {stage === "probe" && (
            <StageProbe
              concept={concept}
              probes={probes}
              setProbes={setProbes}
              estimatedLevel={estimatedLevel}
              setEstimatedLevel={setEstimatedLevel}
              onPrev={() => setStage("input")}
              onNext={() => setStage("roadmap")}
            />
          )}

          {stage === "roadmap" && (
            <StageRoadmap
              concept={concept}
              level={estimatedLevel ?? 2}
              onPrev={() => setStage("probe")}
              onNext={() => { setStepIdx(0); setStage("explain"); }}
            />
          )}

          {stage === "explain" && (
            <StageExplain
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
              onPrev={() => { setStepIdx(STEPS.length - 1); setStage("answering"); }}
              onRestart={newSession}
            />
          )}
        </div>

        {stage === "input" && (
          <div className="brand-badge" aria-label="Socratic">{I.brand}</div>
        )}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="플로우" />
        <TweakSelect
          label="현재 단계"
          value={stage}
          options={STAGE_LIST.map((id) => ({ value: id, label: STAGE_LABELS[id] }))}
          onChange={setStage}
        />
        {LEARN_STAGES.includes(stage) && (
          <TweakSelect
            label="현재 개념"
            value={String(stepIdx)}
            options={STEPS.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.title}` }))}
            onChange={(v) => setStepIdx(Number(v))}
          />
        )}

        <TweakSection label="레이아웃" />
        <TweakToggle label="사이드바 접기" value={t.sidebarCollapsed} onChange={(v) => setTweak("sidebarCollapsed", v)} />
        <TweakToggle label="배경 오로라" value={t.showAurora} onChange={(v) => setTweak("showAurora", v)} />

        <TweakSection label="입력" />
        <TweakSelect
          label="기본 depth"
          value={t.depth}
          options={DEPTHS.map((d) => ({ value: d.value, label: `${d.label} — ${d.hint}` }))}
          onChange={(v) => setTweak("depth", v)}
        />

        <TweakSection label="액센트" />
        <TweakColor
          label="그라데이션"
          value={t.accent}
          options={ACCENT_PRESETS}
          onChange={(v) => setTweak("accent", v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
