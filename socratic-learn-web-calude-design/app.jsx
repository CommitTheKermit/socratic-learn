// Main App — wires together sidebar, canvas, state machine, tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "state": "answering",
  "layout": "standard",
  "dark": false,
  "autoStream": true
}/*EDITMODE-END*/;

const STATES = ['empty', 'streaming', 'answering', 'reviewed'];
const STAGE_LABEL = {
  empty: '개념 입력',
  streaming: '설명 생성 중',
  answering: '질문 답변',
  reviewed: '리뷰',
};

const SAMPLE_CONCEPT = "코루틴이 왜 필요한지 알고 싶어요";

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Theme on <html>.
  React.useEffect(() => {
    document.documentElement.dataset.theme = t.dark ? 'dark' : 'light';
  }, [t.dark]);

  // Answers / skips state (driven, but seeded per state for demo).
  const initialAnswers = React.useMemo(() => ({
    q1: "각 코루틴이 자기 상태를 작은 객체로만 가져서 스택 메모리를 많이 안 써도 되니까",
    q2: "코루틴은 멈추고, 그 사이 스레드는 다른 일을 해요. 그래서 스레드는 안 멈춥니다.",
    q3: "",
  }), []);
  const initialSkips = React.useMemo(() => ({ q1: false, q2: false, q3: true }), []);

  const [answers, setAnswers] = React.useState(initialAnswers);
  const [skips, setSkips] = React.useState(initialSkips);
  const [focusQ, setFocusQ] = React.useState('q2');

  // Re-seed answers/skips when state machine jumps (so each demo state looks coherent).
  React.useEffect(() => {
    if (t.state === 'empty') {
      setAnswers({ q1: '', q2: '', q3: '' });
      setSkips({ q1: false, q2: false, q3: false });
      setFocusQ(null);
    } else if (t.state === 'streaming') {
      setAnswers({ q1: '', q2: '', q3: '' });
      setSkips({ q1: false, q2: false, q3: false });
      setFocusQ(null);
    } else if (t.state === 'answering') {
      setAnswers(initialAnswers);
      setSkips(initialSkips);
      setFocusQ('q2');
    } else if (t.state === 'reviewed') {
      setAnswers(initialAnswers);
      setSkips(initialSkips);
      setFocusQ(null);
    }
  }, [t.state, initialAnswers, initialSkips]);

  // Streaming animation (only while in 'streaming' state).
  const [streamProgress, setStreamProgress] = React.useState(0);
  React.useEffect(() => {
    if (t.state !== 'streaming') {
      setStreamProgress(t.state === 'empty' ? 0 : 1);
      return;
    }
    setStreamProgress(0);
    const startedAt = performance.now();
    const DURATION = 5400;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - startedAt) / DURATION);
      setStreamProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else if (t.autoStream) setTimeout(() => setTweak('state', 'answering'), 400);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t.state]); // eslint-disable-line

  const answeredCount = Object.entries(answers).filter(([k, v]) => v.trim().length > 0 || skips[k]).length;
  const total = QUESTIONS.length;

  // ── Actions ──────────────────────────────────────────────────────────
  const startSession = () => setTweak('state', 'streaming');
  const submitAll = () => setTweak('state', 'reviewed');
  const resetToEmpty = () => setTweak('state', 'empty');

  const onAnswer = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const onToggleSkip = (id) => {
    setSkips((s) => ({ ...s, [id]: !s[id] }));
    if (!skips[id]) setAnswers((a) => ({ ...a, [id]: '' }));
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="app" data-layout={t.layout}>
      <Sidebar
        layout={t.layout}
        currentTitle={t.state === 'empty' ? '새 학습' : SAMPLE_CONCEPT}
        currentStage={STAGE_LABEL[t.state]}
      />
      <main className="main">
        {t.state !== 'empty' && (
          <Topbar state={t.state} onReset={resetToEmpty} />
        )}

        <div className="canvas">
          {t.state === 'empty' && <EmptyState onStart={startSession} />}

          {t.state !== 'empty' && (
            <>
              <SessionHead
                state={t.state}
                onRestream={() => setTweak('state', 'streaming')}
              />
              <SessionBody
                layout={t.layout}
                state={t.state}
                streamProgress={streamProgress}
                onJumpDone={() => setStreamProgress(1)}
                answers={answers}
                skips={skips}
                focusQ={focusQ}
                onFocus={setFocusQ}
                onAnswer={onAnswer}
                onToggleSkip={onToggleSkip}
              />
            </>
          )}
        </div>

        {t.state === 'answering' && (
          <SubmitBar
            answered={answeredCount}
            total={total}
            onSubmit={submitAll}
          />
        )}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="상태" />
        <TweakSelect
          label="현재 상태"
          value={t.state}
          options={STATES.map((s) => ({ value: s, label: STAGE_LABEL[s] || s }))}
          onChange={(v) => setTweak('state', v)}
        />
        <TweakToggle
          label="자동 스트리밍 종료"
          value={t.autoStream}
          onChange={(v) => setTweak('autoStream', v)}
        />
        <TweakButton
          label={t.state === 'streaming' ? '스트리밍 다시 보기' : '스트리밍 시작'}
          onClick={() => setTweak('state', 'streaming')}
        />

        <TweakSection label="레이아웃" />
        <TweakRadio
          label="변형"
          value={t.layout}
          options={[
            { value: 'standard', label: '표준' },
            { value: 'reader', label: '리더' },
            { value: 'split', label: '분할' },
          ]}
          onChange={(v) => setTweak('layout', v)}
        />

        <TweakSection label="테마" />
        <TweakToggle
          label="다크 모드"
          value={t.dark}
          onChange={(v) => setTweak('dark', v)}
        />
      </TweaksPanel>
    </div>
  );
}

// ── Topbar ─────────────────────────────────────────────────────────────
function Topbar({ state, onReset }) {
  const idx = STATES.indexOf(state);
  return (
    <div className="topbar">
      <span className="crumb"><b>최근 학습</b> &nbsp;›&nbsp; 코루틴이 왜 필요한지</span>
      <span className="spacer" />
      <span className="progress-pill">
        <span className="dots">
          {STATES.slice(1).map((s, i) => (
            <i key={s} className={i < idx - 1 ? 'done' : i === idx - 1 ? 'curr' : ''} />
          ))}
        </span>
        {STAGE_LABEL[state]}
      </span>
      <button className="btn-ghost" type="button" onClick={onReset}>
        <Icon name="plus" size={13} /> 새 학습
      </button>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────
function EmptyState({ onStart }) {
  const [val, setVal] = React.useState(SAMPLE_CONCEPT);
  const submit = (e) => { e.preventDefault(); onStart(val); };
  return (
    <div className="empty-hero">
      <div className="empty-eyebrow">SOCRATIC LEARN · 한국어</div>
      <h1 className="empty-h1">
        오늘은 어떤 개념을<br />
        <em>한 줄로</em> 풀어 볼까요?
      </h1>
      <p className="empty-sub">한 문장이면 충분해요. 설명을 받고, 짧게 답하고, 한 번에 제출합니다.</p>

      <form className="concept-input" onSubmit={submit}>
        <textarea
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="예: 코루틴이 왜 필요한지 알고 싶어요"
          rows={2}
        />
        <div className="concept-input-foot">
          <span className="hint">
            <b>⌘↵</b> 학습 시작 &nbsp;·&nbsp; <b>한국어</b>로 답해도 좋아요
          </span>
          <span className="grow" />
          <button className="btn-primary" type="submit">
            학습 시작 <Icon name="arrow-r" size={13} />
          </button>
        </div>
      </form>

      <div className="chip-row">
        <div className="row-label">최근 자주 본 주제</div>
        <button className="chip" type="button">React useEffect cleanup 시점 <span className="arrow"><Icon name="caret-r" size={11} /></span></button>
        <button className="chip" type="button">B+ Tree vs LSM-Tree <span className="arrow"><Icon name="caret-r" size={11} /></span></button>
        <button className="chip" type="button">동시성과 병렬성 차이 <span className="arrow"><Icon name="caret-r" size={11} /></span></button>
        <button className="chip" type="button">CAP 정리의 진짜 의미 <span className="arrow"><Icon name="caret-r" size={11} /></span></button>
      </div>
    </div>
  );
}

// ── SessionHead ────────────────────────────────────────────────────────
function SessionHead({ state, onRestream }) {
  return (
    <div className="session-head">
      <div>
        <h1>{SAMPLE_CONCEPT}</h1>
        <div className="meta">
          <span>Concurrency</span>
          <span className="dot" />
          <span>한국어</span>
          <span className="dot" />
          <span>{state === 'reviewed' ? '제출됨 · 방금' : state === 'answering' ? '설명 완료' : state === 'streaming' ? '생성 중…' : ''}</span>
        </div>
      </div>
      {state === 'reviewed' && (
        <button className="btn-ghost" type="button">
          <Icon name="redo" size={13} /> 같은 개념 다시 풀기
        </button>
      )}
    </div>
  );
}

// ── SessionBody — layout-aware ─────────────────────────────────────────
function SessionBody({ layout, state, streamProgress, onJumpDone, answers, skips, focusQ, onFocus, onAnswer, onToggleSkip }) {
  const showExplanation = true;
  const showQuestions = state !== 'streaming' || streamProgress > 0.55;
  const isReviewed = state === 'reviewed';

  const explanationEl = (
    <ExplanationCard
      blocks={EXPLANATION_BLOCKS}
      progress={state === 'streaming' ? streamProgress : 1}
      isLive={state === 'streaming' && streamProgress < 1}
      onJumpDone={onJumpDone}
    />
  );

  const questionsEl = (
    <>
      {isReviewed && <ReviewBanner stats={{ score: 72, ok: 1, warn: 1, bad: 0 }} />}
      <div className="questions-head">
        <h2>확인 질문</h2>
        <span className="count">{QUESTIONS.length}문항</span>
        <span className="spacer" />
        {!isReviewed && (
          <span className="hint-inline">짧게 적어도 괜찮아요. 모르면 <b>모르겠어요</b>를 눌러도 됩니다.</span>
        )}
      </div>
      <div className="questions">
        {QUESTIONS.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            answer={answers[q.id] || ''}
            skipped={!!skips[q.id]}
            isFocus={focusQ === q.id && !isReviewed}
            isReviewed={isReviewed}
            onAnswer={(v) => onAnswer(q.id, v)}
            onToggleSkip={() => onToggleSkip(q.id)}
            onFocus={() => onFocus(q.id)}
          />
        ))}
      </div>
      {isReviewed && <BranchGrid branches={BRANCHES} />}
    </>
  );

  if (layout === 'split' && state !== 'streaming') {
    return (
      <div className="split-row">
        <div className="split-explanation">{explanationEl}</div>
        <div>{questionsEl}</div>
      </div>
    );
  }
  return (
    <>
      {showExplanation && explanationEl}
      {showQuestions && questionsEl}
    </>
  );
}

// ── Sticky submit bar ──────────────────────────────────────────────────
function SubmitBar({ answered, total, onSubmit }) {
  const pct = (answered / total) * 100;
  return (
    <div className="submit-bar">
      <div className="submit-bar-inner">
        <div className="mini-progress">
          <div className="bar"><i style={{ width: pct + '%' }} /></div>
        </div>
        <div className="submit-status">
          <div><b>{answered} / {total}</b> 문항 답변 또는 모르겠어요로 표시됨</div>
          <div className="small">모든 문항을 완벽히 몰라도 괜찮아요.</div>
        </div>
        <span className="spacer" />
        <button className="btn-primary" type="button" onClick={onSubmit}>
          답변 한 번에 제출 <Icon name="send" size={13} />
          <span className="kbd">⌘↵</span>
        </button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
