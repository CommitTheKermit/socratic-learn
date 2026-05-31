/* Socratic Learn - 현재 웹 구조 정적 스냅샷 (디자인 핸드오프용)
 *
 * frontend/src/ 의 실제 컴포넌트(App / Sidebar / ProgressBar / Hero /
 * stages(Probe·Learn·Done) / branch/BranchDialog)를 그대로 옮긴 정적 버전.
 * - API 호출/상태머신/localStorage 는 제거하고 mock 데이터로 대체했다.
 * - 클래스명은 실제와 1:1 동일하므로 styles.css + branch.css 가 그대로 적용된다.
 * - 우하단 "디자인 툴바"로 단계(input/probe/learn/done) 전환, 사이드바 접기,
 *   분기 다이얼로그/채점 상태를 토글하며 모든 화면을 둘러볼 수 있다. */

const { useState } = React;

/* ── 아이콘 (frontend/src/components/icons.tsx 동일) ─────────────────── */
const Ico = ({ d, size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
       strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);
const I = {
  brand: <Ico d={<><path d="M3 12c4 0 6-3 9-3s5 3 9 3" /><path d="M3 17c4 0 6-3 9-3s5 3 9 3" /></>} />,
  sidebar: <Ico d={<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></>} />,
  capture: <Ico d={<><path d="M5 8h2l1.5-2h7L17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" /><circle cx="12" cy="13" r="3.5" /></>} />,
  archive: <Ico d={<><rect x="3" y="4" width="18" height="4.5" rx="1.5" /><path d="M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 19.5 19V8.5" /><path d="M10 12h4" /></>} />,
  folder: <Ico d={<><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z" /></>} />,
  history: <Ico d={<><path d="M4 12a8 8 0 1 0 2.5-5.8L4 9" /><path d="M4 4v5h5" /><path d="M12 8v4l3 2" /></>} />,
  chevSmall: <Ico size={14} d={<><path d="m6 9 6 6 6-6" /></>} />,
  trash: <Ico size={14} d={<><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7v12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7" /><path d="M10 11v6M14 11v6" /></>} />,
  signout: <Ico size={15} d={<><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>} />,
  userOutline: <Ico size={18} d={<><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></>} />,
};

/* ── mock 데이터 (frontend/src/stages/data.ts 발췌) ─────────────────── */
const DEPTHS = [
  { value: "0depth", label: "0depth", hint: "한 줄로 핵심만" },
  { value: "1depth", label: "1depth", hint: "맥락과 흐름까지" },
  { value: "2depth", label: "2depth", hint: "깊은 원리까지" },
];
const HOW_STEPS = [
  { n: "01", title: "수준 확인", desc: "몇 가지 질문으로 지금 아는 만큼을 가늠해요" },
  { n: "02", title: "단계 제시", desc: "개념을 작은 단계로 나눠 학습 순서를 그려요" },
  { n: "03", title: "학습 진행", desc: "설명을 읽고, 직접 답하며 이해를 확인해요" },
  { n: "04", title: "완료", desc: "무엇을 알게 됐는지 정리해드려요" },
];
const PHASES = [
  { id: "input", label: "개념 입력" },
  { id: "probe", label: "수준 확인" },
  { id: "learn", label: "학습 진행" },
  { id: "done", label: "완료" },
];
const STAGE_LABELS = { input: "개념 입력", probe: "수준 확인", learn: "학습 진행", done: "완료" };
const LEVEL_LABELS = ["처음 만나는 단계", "단어를 알고 있는 단계", "맥락을 이해하는 단계", "직접 다뤄본 단계", "설명할 수 있는 단계"];
const CONCEPT = "코루틴이 왜 필요한지";

const PROBE_QUESTIONS = [
  {
    id: "p1", kind: "choice", q: "이 개념을 들었을 때 어떤 느낌이 드시나요?",
    options: [
      { value: 0, label: "단어 자체가 처음이에요" },
      { value: 1, label: "어디서 들어본 적은 있어요" },
      { value: 2, label: "어떤 맥락에서 쓰이는지 알아요" },
      { value: 3, label: "직접 다뤄본 적이 있어요" },
    ],
  },
  {
    id: "p2", kind: "multi", q: "연관 있어 보이는 단어를 모두 골라주세요",
    sub: "정확하지 않아도 괜찮아요. 감으로 골라도 됩니다.",
    options: [
      { value: "thread", label: "스레드" }, { value: "suspend", label: "suspend" },
      { value: "async", label: "async/await" }, { value: "callback", label: "콜백" },
      { value: "index", label: "DB 인덱스" }, { value: "shader", label: "셰이더" },
    ],
  },
  {
    id: "p3", kind: "text", q: "이 개념이 해결하려는 문제를 한 줄로 적어볼까요?",
    placeholder: "모르면 비워두셔도 괜찮아요",
  },
];

const STEPS = [
  {
    id: 1, title: "동시성과 병렬성", desc: "헷갈리기 쉬운 두 단어부터",
    body: `**동시성(concurrency)**은 여러 일을 *번갈아* 다루는 능력입니다. 한 번에 하나씩 처리하더라도, 여러 일을 진행 중인 상태로 둘 수 있다면 동시성이 있다고 봅니다.

**병렬성(parallelism)**은 여러 일을 *같은 시각*에 처리하는 것을 말합니다. 코어가 두 개 이상 필요해요.

비유로 보면, 한 명이 양손으로 번갈아 일을 하면 동시성, 두 명이 따로 하면 병렬성입니다. 코루틴은 이 중 **동시성**을 다루기 위한 도구입니다.`,
    questions: [
      { id: "1-1", q: "동시성과 병렬성의 차이를 한 줄로 정리해보세요." },
      { id: "1-2", q: "단일 코어 CPU에서도 동시성이 가능한 이유는?" },
    ],
  },
  {
    id: 2, title: "스레드의 비용", desc: "왜 더 가벼운 단위가 필요할까",
    body: `스레드는 OS 단위의 작업 단위라서, 만들고 끄는 비용이 큽니다. 한 스레드는 자기 **콜스택**을 통째로 들고 있고, 메모리로는 보통 \`1MB\` 정도를 차지합니다.

수천 개의 일을 동시에 다루려면 스레드를 그만큼 만들어야 할까요? 그건 너무 비싼 선택이에요. *컨텍스트 스위칭* 비용도 무시할 수 없습니다.`,
    questions: [
      { id: "2-1", q: "스레드 한 개가 차지하는 메모리는 보통 어느 정도인가요?" },
      { id: "2-2", q: "수천 개의 동시 작업이 필요할 때 스레드만 쓰면 어떤 문제가 생기나요?" },
    ],
  },
  {
    id: 3, title: "일시중단 함수", desc: "코루틴의 핵심 도구 - suspend",
    body: `\`suspend\` 함수는 *언제든 멈췄다가 이어서 실행될 수 있는* 함수입니다.

\`\`\`kotlin
suspend fun fetchUser(id: Int): User {
  val token = getToken()        // 멈춤 가능
  return api.user(id, token)    // 멈춤 가능
}
\`\`\`

코루틴이 멈춰 있는 동안 스레드는 다른 코루틴을 돌리면 됩니다. **스레드는 멈추지 않습니다.**`,
    questions: [{ id: "3-1", q: "suspend 함수의 핵심 특징을 한 단어로 표현한다면?" }],
  },
  {
    id: 4, title: "코루틴이 가벼운 이유", desc: "콜스택 대신 상태 객체",
    body: `스레드처럼 콜스택을 통째로 들고 있는 대신, 코루틴은 **자기 상태를 작은 객체 하나**로 들고 갑니다.

그래서 한 스레드 위에서 *수천 개*의 코루틴을 굴릴 수 있어요.`,
    questions: [
      { id: "4-1", q: "코루틴이 자기 상태를 어떻게 들고 있나요?" },
      { id: "4-2", q: "한 스레드 위에 코루틴을 여러 개 둘 수 있는 이유는?" },
    ],
  },
];

const SESSIONS = [
  { sessionId: "s-1", conceptSummary: "코루틴이 왜 필요한지", stage: "learn", createdAt: Date.now() },
  { sessionId: "s-2", conceptSummary: "React 렌더링 최적화", stage: "done", createdAt: Date.now() - 3600_000 },
  { sessionId: "s-3", conceptSummary: "TCP 혼잡 제어", stage: "probe", createdAt: Date.now() - 26 * 3600_000 },
];

const BRANCH_OPTIONS = [
  { type: "ai_recommended", label: "더 깊이 파고들기", isRecommended: true, stageContent: { title: "구조화 동시성", desc: "코루틴 스코프와 취소 전파" } },
  { type: "roadmap_next", label: "다음 개념으로", stageContent: { title: "코루틴이 가벼운 이유", desc: "콜스택 대신 상태 객체" } },
  { type: "additional", label: "보충 개념 하나 더", stageContent: { title: "컨텍스트 스위칭 비용", desc: "왜 비싼가" } },
  { type: "exit", label: "여기서 마치기" },
];

/* ── 간이 마크다운 (lib/markdown.tsx 축약: p / code-fence / inline) ──── */
function renderInline(text, kp) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, key = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith("**")) parts.push(<strong key={kp + key++}>{s.slice(2, -2)}</strong>);
    else if (s.startsWith("*")) parts.push(<em key={kp + key++}>{s.slice(1, -1)}</em>);
    else parts.push(<code key={kp + key++} className="md-code">{s.slice(1, -1)}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
function Markdown({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let code = null, para = [];
  const flush = () => { if (para.length) { blocks.push({ kind: "p", text: para.join(" ") }); para = []; } };
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (code) { blocks.push({ kind: "code", lang: code.lang, text: code.lines.join("\n") }); code = null; }
      else { flush(); code = { lang: line.slice(3).trim(), lines: [] }; }
      continue;
    }
    if (code) { code.lines.push(line); continue; }
    if (line.trim() === "") flush();
    else para.push(line.trim());
  }
  flush();
  return (
    <div className="md-body">
      {blocks.map((b, i) =>
        b.kind === "code" ? (
          <div className="code-block" key={i}>
            {b.lang && <span className="code-lang">{b.lang}</span>}
            <code>{b.text}</code>
          </div>
        ) : (
          <p key={i}>{renderInline(b.text, "k" + i)}</p>
        ),
      )}
    </div>
  );
}

/* ── Sidebar ────────────────────────────────────────────────────────── */
function Sidebar({ stage, onToggleCollapse, loggedIn, onPickStage }) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const relTime = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="sb-brand-mark">{I.brand}</span>
        <span className="sb-brand-name">Socratic</span>
        <button className="sb-collapse" aria-label="사이드바 접기" onClick={onToggleCollapse} type="button">{I.sidebar}</button>
      </div>

      <button className={"sb-item is-primary" + (stage === "input" ? " is-active" : "")} type="button" onClick={() => onPickStage("input")}>
        <span className="ico">{I.capture}</span>새로 학습하기
      </button>
      <button className="sb-item" type="button"><span className="ico">{I.archive}</span>아카이브</button>
      <button className="sb-item" type="button"><span className="ico">{I.folder}</span>폴더</button>

      <div className="sb-divider" />

      <button className="sb-section" aria-expanded={historyOpen} onClick={() => setHistoryOpen((v) => !v)} type="button">
        <span className="ico">{I.history}</span>학습 히스토리<span className="chev">{I.chevSmall}</span>
      </button>

      {historyOpen && (
        <div className="sb-history-list">
          {SESSIONS.map((s, i) => {
            const active = i === 0;
            return (
              <div key={s.sessionId} className={"sb-history-item" + (active ? " is-active" : "")} aria-current={active ? "true" : undefined}>
                <button className="sb-history-open" type="button">
                  <span className="sb-hi-main">
                    <span className="sb-hi-title">
                      {active && <span className="sb-hi-livedot" />}
                      <span className="nm">{s.conceptSummary}</span>
                    </span>
                    <span className="sb-hi-meta">
                      <span className="stg">{STAGE_LABELS[s.stage]}</span>
                      <span className="sep">·</span>
                      {active ? "진행 중" : relTime(s.createdAt)}
                    </span>
                  </span>
                </button>
                <button className="sb-hi-del" type="button" aria-label="세션 삭제">{I.trash}</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="sb-spacer" />

      <div className="sb-foot">
        {loggedIn ? (
          <div className="sb-user">
            <div className="sb-avatar">U</div>
            <div className="sb-user-name">octocat</div>
            <button className="sb-signout" type="button" aria-label="로그아웃">{I.signout}</button>
          </div>
        ) : (
          <div className="sb-auth">
            <div className="sb-auth-row">
              <div className="sb-auth-avatar">{I.userOutline}</div>
              <div className="sb-auth-title">학습 시작을 위해 로그인이 필요해요</div>
            </div>
            <button className="sb-login" type="button">로그인</button>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── ProgressBar ────────────────────────────────────────────────────── */
function ProgressBar({ stage, stepIdx }) {
  const currentPhaseIdx = PHASES.findIndex((p) => p.id === stage);
  const stepsCount = STEPS.length;
  return (
    <div className="phase-bar">
      {PHASES.map((p, i) => {
        const state = i < currentPhaseIdx ? "done" : i === currentPhaseIdx ? "curr" : "todo";
        let fillPct = 0;
        if (state === "done") fillPct = 100;
        else if (state === "curr") fillPct = p.id === "learn" ? ((stepIdx + 1) / stepsCount) * 100 : 100;
        return (
          <div key={p.id} className={`pb-seg is-${state}`}>
            <span className="pb-track"><span className="pb-fill" style={{ width: fillPct + "%" }} /></span>
            <span className="pb-label">
              <span className="pb-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="pb-name">{p.label}</span>
              {p.id === "learn" && state === "curr" && (
                <span className="pb-sub">개념 {Math.min(stepIdx + 1, stepsCount)}/{stepsCount}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hero (input) ───────────────────────────────────────────────────── */
function Hero({ onStart }) {
  const [depth, setDepth] = useState("0depth");
  const [concept, setConcept] = useState(CONCEPT);
  const [guideOpen, setGuideOpen] = useState(true);
  return (
    <section className="hero">
      <h1>어떤 개념을<br />가장 먼저 배워볼까요?</h1>
      <p className="sub">한 줄로 입력하시면 도와드릴게요</p>

      <form className="input-bar" onSubmit={(e) => { e.preventDefault(); onStart(); }}>
        <label className="depth-select">
          {DEPTHS.find((d) => d.value === depth)?.label || "0depth"}
          <span className="chev">{I.chevSmall}</span>
          <select value={depth} onChange={(e) => setDepth(e.target.value)}>
            {DEPTHS.map((d) => <option key={d.value} value={d.value}>{d.label} · {d.hint}</option>)}
          </select>
        </label>
        <textarea rows={1} placeholder="배우고 싶은 개념을 입력해서 시작해보세요"
          value={concept} onChange={(e) => setConcept(e.target.value)} />
        <button className="btn-capture" type="submit">학습 시작</button>
      </form>

      <div className="hero-guide">
        <div className="hg-toggle-wrap">
          <button type="button" className={"hg-toggle" + (guideOpen ? " is-open" : "")} aria-expanded={guideOpen} onClick={() => setGuideOpen((v) => !v)}>
            Socratic은 이렇게 학습해요<span className="chev">{I.chevSmall}</span>
          </button>
        </div>
        {guideOpen && (
          <div className="hg-panel">
            <div className="hg-steps">
              {HOW_STEPS.map((s) => (
                <div className="hg-step" key={s.n}>
                  <span className="hg-node">{s.n}</span>
                  <span className="hg-title">{s.title}</span>
                  <span className="hg-desc">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Probe (01 수준 확인) ───────────────────────────────────────────── */
function StageProbe({ onPrev, onNext }) {
  const [p1, setP1] = useState(1);
  const [p2, setP2] = useState(["suspend", "async"]);
  const [p3, setP3] = useState("");
  const toggle = (v) => setP2((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">01 · 수준 확인</div>
        <h2 className="stage-title">{CONCEPT}, 몇 가지만 짧게 여쭐게요</h2>
        <p className="stage-sub">답을 보고 수준을 추정해서 단계와 깊이를 맞춰드릴게요</p>
      </header>

      <div className="stage-body">
        <div className="probe-list">
          {PROBE_QUESTIONS.map((p) => {
            if (p.kind === "choice")
              return (
                <div className="probe-row" key={p.id}>
                  <div className="probe-q">{p.q} <span className="probe-badge probe-badge--required">필수</span></div>
                  <div className="probe-choices">
                    {p.options.map((o) => (
                      <button key={o.value} type="button" className={"probe-choice" + (p1 === o.value ? " is-active" : "")} onClick={() => setP1(o.value)}>
                        <span className="probe-radio" aria-hidden />
                        <span className="probe-label">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            if (p.kind === "multi")
              return (
                <div className="probe-row" key={p.id}>
                  <div className="probe-q">{p.q} <span className="probe-badge">선택</span></div>
                  <div className="probe-sub">{p.sub}</div>
                  <div className="probe-chips">
                    {p.options.map((o) => (
                      <button key={o.value} type="button" className={"probe-chip" + (p2.includes(o.value) ? " is-active" : "")} onClick={() => toggle(o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
              );
            return (
              <div className="probe-row" key={p.id}>
                <div className="probe-q">{p.q} <span className="probe-badge">선택</span></div>
                <div className="probe-sub">건너뛰셔도 괜찮아요.</div>
                <textarea className="probe-text" rows={2} placeholder={p.placeholder} value={p3} onChange={(e) => setP3(e.target.value)} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={onPrev}>← 개념 다시 입력</button>
        <span className="grow" />
        <button className="btn-holo" type="button" onClick={onNext}>단계 만들기 →</button>
      </div>
    </section>
  );
}

/* ── Learn (통합 학습 페이지 · lv2 2-column) ────────────────────────── */
const GRADE_LABEL = { correct: "정답", almost: "거의 맞음", partial: "부족", wrong: "오답" };

function StageLearn({ onPrev, onDone, graded, onOpenBranch }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({ "1-1": "동시성은 번갈아, 병렬성은 동시에 처리합니다." });
  const step = STEPS[stepIdx];
  // graded 일 때 첫 문항 채점 예시
  const evalFor = (qid, i) => {
    if (!graded) return null;
    if (i === 0) return { grade: "correct", feedback: "정확합니다. 핵심을 한 줄로 잘 정리하셨어요." };
    if (i === 1) return { grade: "partial", feedback: "방향은 맞아요. '시분할'이라는 키워드를 떠올려 보세요." };
    return { grade: "almost", feedback: "거의 맞습니다." };
  };

  return (
    <div className="lv-board">
      <header className="lv-bar">
        <div className="lv-bar-top">
          <span className="lv-bar-eyebrow">학습 진행</span>
          <span className="lv-bar-title">{CONCEPT}</span>
          <span className="lv-bar-spacer" />
          <span className="lv-bar-meta">개념 {stepIdx + 1}/{STEPS.length} · {LEVEL_LABELS[2]}</span>
        </div>
        <ol className="lv-steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className={"lv-step" + (i === stepIdx ? " is-curr" : "") + (i < stepIdx ? " is-done" : "")}>
              <button type="button" onClick={() => setStepIdx(i)}>
                <span className="lv-step-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="lv-step-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </header>

      <div className="lv-body lv2-body">
        <div className="lv2-left">
          <div className="lv2-left-inner">
            <span className="lv2-eyebrow">개념 설명</span>
            <h3>{step.title}</h3>
            <p className="lv2-sub">{step.desc}</p>
            <Markdown text={step.body} />
          </div>
        </div>
        <div className="lv2-right">
          <div className="lv2-right-head">
            <span className="label">확인 질문</span>
            <span className="count">{step.questions.length}문항</span>
          </div>
          {step.questions.map((q, i) => {
            const val = answers[q.id] || "";
            const ev = evalFor(q.id, i);
            return (
              <div key={q.id} className={"qa-pair" + (ev ? ` is-graded grade-${ev.grade}` : "")}>
                <div className="qa-head">
                  <span className="qa-num">Q{i + 1}</span>
                  <span className="qa-question">{q.q}</span>
                  {ev && <span className={`grade-badge grade-${ev.grade}`}>{GRADE_LABEL[ev.grade]}</span>}
                </div>
                <textarea className="qa-answer" placeholder="자유롭게 적어주세요. 짧아도 좋아요."
                  value={val} readOnly={graded}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                {ev && (
                  <div className="qa-feedback">
                    <span className="qa-feedback-label">AI 피드백</span>
                    <p>{ev.feedback}</p>
                  </div>
                )}
                <div className="qa-foot"><span className="qa-count">{val.length}자</span></div>
              </div>
            );
          })}
          <div className="lv2-right-sticky-bottom">
            {graded ? (
              <button className="lv-btn-holo lv-submit" type="button" onClick={onOpenBranch}>
                <span className="lv-submit-icon" aria-hidden>{I.brand}</span>평가 보기
              </button>
            ) : (
              <button className="lv-btn-holo lv-submit" type="button">
                <span className="lv-submit-icon" aria-hidden>{I.brand}</span>답변 제출하기
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="lv-foot">
        <button className="lv-btn-ghost" type="button" onClick={() => stepIdx === 0 ? onPrev() : setStepIdx(stepIdx - 1)}>
          ← {stepIdx === 0 ? "수준 확인 다시 보기" : "이전 개념"}
        </button>
        <span className="grow" />
        <button className="lv-btn-ghost" type="button">모르겠어요 (전체 건너뜀)</button>
        <button className="lv-btn-holo" type="button" onClick={() => stepIdx >= STEPS.length - 1 ? onDone() : setStepIdx(stepIdx + 1)}>
          {stepIdx >= STEPS.length - 1 ? "학습 마치기" : "다음 개념"} →
        </button>
      </div>
    </div>
  );
}

/* ── Branch Dialog (평가 완료 → 분기 선택) ──────────────────────────── */
function BdIcon({ type }) {
  const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (type === "roadmap_next") return <svg {...common}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
  if (type === "ai_recommended") return <svg {...common}><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="m6 6 2.5 2.5" /><path d="m15.5 15.5 2.5 2.5" /><path d="m18 6-2.5 2.5" /><path d="m8.5 15.5-6 6" /></svg>;
  if (type === "exit") return <svg {...common}><path d="M9 6h11v12H9" /><path d="m13 9 3 3-3 3" /><path d="M4 12h12" /></svg>;
  return <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>;
}
function BranchDialog({ onClose }) {
  return (
    <>
      <div className="bd-backdrop" aria-hidden onClick={onClose} />
      <div className="bd-frame" role="dialog" aria-modal="true">
        <div className="bd-surface">
          <div className="bd-head">
            <div>
              <div className="bd-eyebrow">평가 완료 · 다음 분기 선택</div>
              <h3 className="bd-title">다음으로 어디로 가볼까요?</h3>
              <p className="bd-sub">방금 답변을 평가했어요. 알맞은 길을 골라주세요.</p>
            </div>
            <button className="bd-close" type="button" aria-label="닫기" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 6 18 18" /><path d="M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="bd-body">
            <div className="bd-eval">
              <div className="bd-eval-eyebrow">평가 결과</div>
              <p className="bd-eval-body">{renderInline("동시성과 병렬성을 **정확히 구분**하셨어요. 단일 코어 동시성은 *시분할* 개념을 한 번 더 다지면 좋겠습니다.", "ev")}</p>
            </div>
            <div className="bd-section-head"><span className="h">다음 학습 분기</span><span className="meta">{BRANCH_OPTIONS.length}개 옵션</span></div>
            <div className="bd-list">
              {BRANCH_OPTIONS.map((opt, i) => {
                const isExit = opt.type === "exit";
                return (
                  <button key={i} className={"bd-card" + (opt.isRecommended ? " is-rec" : "") + (isExit ? " is-exit" : "")} type="button" onClick={onClose}>
                    <span className={"bd-icon" + (opt.isRecommended ? " is-holo" : "")}><BdIcon type={opt.type} /></span>
                    <span className="bd-body-col">
                      <span className="bd-label">{opt.label}{opt.isRecommended && <span className="bd-rec">추천</span>}</span>
                      <span className="bd-preview">{isExit ? "여기까지의 학습을 정리하고 마치기" : `${opt.stageContent.title} · ${opt.stageContent.desc}`}</span>
                    </span>
                    <span className="bd-chev"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg></span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Done (완료) ────────────────────────────────────────────────────── */
function StageDone({ onPrev, onRestart }) {
  const allQuestions = STEPS.flatMap((s) => s.questions);
  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">완료</div>
        <h2 className="stage-title">잘 마쳤어요</h2>
        <p className="stage-sub">{CONCEPT} · {STEPS.length}개 개념을 모두 마쳤습니다</p>
      </header>
      <div className="stage-body">
        <div className="done-card">
          <div className="done-row"><span className="done-k">시작 수준</span><span className="done-v">L2 · {LEVEL_LABELS[2]}</span></div>
          <div className="done-row"><span className="done-k">답변</span><span className="done-v">{allQuestions.length} / {allQuestions.length} 문항</span></div>
          <div className="done-row"><span className="done-k">모르겠어요</span><span className="done-v">1 문항 · 다음 학습에서 다시 만나요</span></div>
          <div className="done-row"><span className="done-k">저장</span><span className="done-v">로컬 전용 (서버 미사용)</span></div>
        </div>
      </div>
      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={onPrev}>← 마지막 답변 다시 보기</button>
        <span className="grow" />
        <button className="btn-holo" type="button" onClick={onRestart}>새 개념 시작 →</button>
      </div>
    </section>
  );
}

/* ── App + 디자인 툴바 ──────────────────────────────────────────────── */
function App() {
  const [stage, setStage] = useState("input");
  const [collapsed, setCollapsed] = useState(false);
  const [graded, setGraded] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  return (
    <div className="app" data-sidebar={collapsed ? "collapsed" : "open"} data-stage={stage}>
      <Sidebar stage={stage} loggedIn={stage !== "input"} onToggleCollapse={() => setCollapsed((v) => !v)} onPickStage={setStage} />

      <main className="main">
        <div className="aurora" aria-hidden><div className="vignette" /></div>

        {stage !== "input" && <ProgressBar stage={stage} stepIdx={1} />}

        <div className="main-inner">
          {stage === "input" && <Hero onStart={() => setStage("probe")} />}
          {stage === "probe" && <StageProbe onPrev={() => setStage("input")} onNext={() => setStage("learn")} />}
          {stage === "learn" && <StageLearn graded={graded} onPrev={() => setStage("probe")} onDone={() => setStage("done")} onOpenBranch={() => setBranchOpen(true)} />}
          {stage === "done" && <StageDone onPrev={() => setStage("learn")} onRestart={() => setStage("input")} />}
        </div>

        {stage === "input" && <div className="brand-badge" aria-label="Socratic">{I.brand}</div>}
      </main>

      {branchOpen && <BranchDialog onClose={() => setBranchOpen(false)} />}

      {/* 디자인 핸드오프용 데모 툴바 (실제 앱에는 없음) */}
      <DesignToolbar
        stage={stage} setStage={setStage}
        collapsed={collapsed} setCollapsed={setCollapsed}
        graded={graded} setGraded={setGraded}
        openBranch={() => { setStage("learn"); setGraded(true); setBranchOpen(true); }}
      />
    </div>
  );
}

function DesignToolbar({ stage, setStage, collapsed, setCollapsed, graded, setGraded, openBranch }) {
  const [open, setOpen] = useState(true);
  if (!open) return <button className="dt-fab" onClick={() => setOpen(true)} title="디자인 툴바 열기">◐</button>;
  return (
    <div className="dt-bar">
      <div className="dt-row">
        <span className="dt-cap">STAGE</span>
        {["input", "probe", "learn", "done"].map((s) => (
          <button key={s} className={"dt-btn" + (stage === s ? " on" : "")} onClick={() => setStage(s)}>{s}</button>
        ))}
      </div>
      <div className="dt-row">
        <button className={"dt-btn" + (collapsed ? " on" : "")} onClick={() => setCollapsed((v) => !v)}>사이드바 접기</button>
        <button className={"dt-btn" + (graded ? " on" : "")} onClick={() => setGraded((v) => !v)}>채점 상태</button>
        <button className="dt-btn" onClick={openBranch}>분기 다이얼로그</button>
        <button className="dt-btn dt-x" onClick={() => setOpen(false)}>✕</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
