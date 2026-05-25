// Print version of the App — renders each major state as its own page.
// Reuses Sidebar, ExplanationCard, QuestionCard, ReviewBanner, BranchGrid from the main bundle.

const STATES_PRINT = ['empty', 'streaming', 'answering', 'reviewed'];
const STAGE_LABEL_P = {
  empty: '개념 입력',
  streaming: '설명 생성 중',
  answering: '질문 답변',
  reviewed: '리뷰',
};
const SAMPLE_CONCEPT_P = "코루틴이 왜 필요한지 알고 싶어요";

const SEEDED_ANSWERS = {
  q1: "각 코루틴이 자기 상태를 작은 객체로만 가져서 스택 메모리를 많이 안 써도 되니까",
  q2: "코루틴은 멈추고, 그 사이 스레드는 다른 일을 해요. 그래서 스레드는 안 멈춥니다.",
  q3: "",
};
const SEEDED_SKIPS = { q1: false, q2: false, q3: true };

function PrintTopbar({ state }) {
  const idx = STATES_PRINT.indexOf(state);
  return (
    <div className="topbar">
      <span className="crumb"><b>최근 학습</b> &nbsp;›&nbsp; 코루틴이 왜 필요한지</span>
      <span className="spacer" />
      <span className="progress-pill">
        <span className="dots">
          {STATES_PRINT.slice(1).map((s, i) => (
            <i key={s} className={i < idx - 1 ? 'done' : i === idx - 1 ? 'curr' : ''} />
          ))}
        </span>
        {STAGE_LABEL_P[state]}
      </span>
      <button className="btn-ghost" type="button">
        <Icon name="plus" size={13} /> 새 학습
      </button>
    </div>
  );
}

function PrintEmpty() {
  return (
    <div className="empty-hero">
      <div className="empty-eyebrow">SOCRATIC LEARN · 한국어</div>
      <h1 className="empty-h1">
        오늘은 어떤 개념을<br />
        <em>한 줄로</em> 풀어 볼까요?
      </h1>
      <p className="empty-sub">한 문장이면 충분해요. 설명을 받고, 짧게 답하고, 한 번에 제출합니다.</p>
      <form className="concept-input" onSubmit={(e) => e.preventDefault()}>
        <textarea defaultValue={SAMPLE_CONCEPT_P} rows={2} />
        <div className="concept-input-foot">
          <span className="hint">
            <b>⌘↵</b> 학습 시작 &nbsp;·&nbsp; <b>한국어</b>로 답해도 좋아요
          </span>
          <span className="grow" />
          <button className="btn-primary" type="button">
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

function PrintSessionHead({ state }) {
  return (
    <div className="session-head">
      <div>
        <h1>{SAMPLE_CONCEPT_P}</h1>
        <div className="meta">
          <span>Concurrency</span>
          <span className="dot" />
          <span>한국어</span>
          <span className="dot" />
          <span>
            {state === 'reviewed' ? '제출됨 · 방금'
              : state === 'answering' ? '설명 완료'
              : state === 'streaming' ? '생성 중…' : ''}
          </span>
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

// Page: a single full-bleed "screen" of the app at a fixed state/layout.
function Page({ state, layout = 'standard', label }) {
  const isReviewed = state === 'reviewed';
  const streamProgress = state === 'streaming' ? 0.62 : 1;

  const explanationEl = (
    <ExplanationCard
      blocks={EXPLANATION_BLOCKS}
      progress={streamProgress}
      isLive={state === 'streaming'}
      onJumpDone={() => {}}
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
            answer={SEEDED_ANSWERS[q.id] || ''}
            skipped={!!SEEDED_SKIPS[q.id]}
            isFocus={state === 'answering' && q.id === 'q2'}
            isReviewed={isReviewed}
            onAnswer={() => {}}
            onToggleSkip={() => {}}
            onFocus={() => {}}
          />
        ))}
      </div>
      {isReviewed && <BranchGrid branches={BRANCHES} />}
    </>
  );

  const bodyEl = layout === 'split' && state !== 'streaming'
    ? (
      <div className="split-row">
        <div className="split-explanation">{explanationEl}</div>
        <div>{questionsEl}</div>
      </div>
    )
    : (
      <>
        {explanationEl}
        {state !== 'streaming' || streamProgress > 0.55 ? questionsEl : null}
      </>
    );

  return (
    <section className="print-page">
      <header className="print-page-head">
        <span className="print-page-eyebrow">SOCRATIC LEARN WEB · 프로토타입</span>
        <span className="print-page-label">{label}</span>
      </header>
      <div className="print-frame">
        <div className="app" data-layout={layout}>
          <Sidebar
            layout={layout}
            currentTitle={state === 'empty' ? '새 학습' : SAMPLE_CONCEPT_P}
            currentStage={STAGE_LABEL_P[state]}
          />
          <main className="main">
            {state !== 'empty' && <PrintTopbar state={state} />}
            <div className="canvas">
              {state === 'empty' ? <PrintEmpty /> : (
                <>
                  <PrintSessionHead state={state} />
                  {bodyEl}
                </>
              )}
            </div>
            {state === 'answering' && (
              <div className="submit-bar print-submit-bar">
                <div className="submit-bar-inner">
                  <div className="mini-progress">
                    <div className="bar"><i style={{ width: '66%' }} /></div>
                  </div>
                  <div className="submit-status">
                    <div><b>2 / 3</b> 문항 답변 또는 모르겠어요로 표시됨</div>
                    <div className="small">모든 문항을 완벽히 몰라도 괜찮아요.</div>
                  </div>
                  <span className="spacer" />
                  <button className="btn-primary" type="button">
                    답변 한 번에 제출 <Icon name="send" size={13} />
                    <span className="kbd">⌘↵</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}

function PrintApp() {
  return (
    <>
      <Page state="empty"     layout="standard" label="01 · Empty — 개념 입력" />
      <Page state="streaming" layout="standard" label="02 · Streaming — 설명 생성 중" />
      <Page state="answering" layout="standard" label="03 · Answering — 질문 답변 (표준 레이아웃)" />
      <Page state="reviewed"  layout="standard" label="04 · Reviewed — 채점 + 다음 분기" />
      <Page state="answering" layout="reader"   label="05 · Answering — Reader 레이아웃 (사이드바 축소)" />
      <Page state="answering" layout="split"    label="06 · Answering — Split 레이아웃 (설명 좌측 고정)" />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PrintApp />);

// Auto-print once fonts are loaded and Babel-transpiled scripts have all executed.
(async () => {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
  await new Promise((r) => setTimeout(r, 700));
  window.print();
})();
