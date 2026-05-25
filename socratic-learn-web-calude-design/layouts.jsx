// 4 layout samples for "학습 진행" page — 설명 + 확인 질문 + 답변 한 페이지에 합치기.
// Uses the same step content + Markdown renderer from stages-v3.jsx.

const STEP = STEPS[0]; // "동시성과 병렬성" — same content for all 4 layouts.

// Common building blocks ──────────────────────────────────────────────────

function PhaseBar({ title = "동시성과 병렬성", num = "개념 1/4" }) {
  return (
    <div className="lv-bar">
      <span className="lv-bar-eyebrow">학습 진행</span>
      <span className="lv-bar-title">{title}</span>
      <span className="lv-bar-spacer" />
      <span className="lv-bar-meta">{num}</span>
    </div>
  );
}

function Foot({ primary = "다음 개념 →", prev = "← 설명 다시 보기" }) {
  return (
    <div className="lv-foot">
      <button className="lv-btn-ghost" type="button">{prev}</button>
      <span style={{ flex: 1 }} />
      <button className="lv-btn-ghost" type="button">건너뛰기</button>
      <button className="lv-btn-holo" type="button">{primary}</button>
    </div>
  );
}

// One question + its answer textarea (shared by L1/L2/L4).
function QAPair({ idx, q }) {
  return (
    <div className="qa-pair">
      <div className="qa-head">
        <span className="qa-num">Q{idx + 1}</span>
        <span className="qa-question">{q.q}</span>
        <span className="qa-hint">힌트 — {q.hint}</span>
      </div>
      <textarea
        className="qa-answer"
        placeholder="자유롭게 적어주세요. 짧아도 좋아요."
        defaultValue={idx === 0 ? "동시성은 한 번에 여러 일을 진행 중인 상태로 두는 것이고, 병렬성은 같은 시각에 처리하는 것." : ""}
      />
      <div className="qa-foot">
        <span className="qa-count">{idx === 0 ? "42자" : "0자"}</span>
        <span className="grow" />
        <button className="qa-skip" type="button">모르겠어요</button>
      </div>
    </div>
  );
}

// ── 01 · 단일 세로 스크롤 ─────────────────────────────────────────────────

function Layout1() {
  return (
    <div className="lv-board">
      <PhaseBar />
      <div className="lv-body lv1-body">
        <header className="lv1-head">
          <span className="lv1-eyebrow">01 · 개념 설명</span>
          <h2 className="lv1-title">{STEP.title}</h2>
          <p className="lv1-sub">{STEP.desc}</p>
        </header>

        <article className="lv1-explain">
          <Markdown text={STEP.body} />
        </article>

        <div>
          <div className="lv-section-h">
            <span className="num">02 · 확인 질문</span>
            <span className="title">이해한 것을 짧게 정리해보세요</span>
            <span className="meta">{STEP.questions.length}문항</span>
          </div>
          <div className="lv1-qlist">
            {STEP.questions.map((q, i) => (
              <QAPair key={q.id} idx={i} q={q} />
            ))}
          </div>
        </div>
      </div>
      <Foot />
    </div>
  );
}

// ── 02 · 좌우 2컬럼 (설명 sticky | 질문+답) ──────────────────────────────

function Layout2() {
  return (
    <div className="lv-board">
      <PhaseBar />
      <div className="lv-body lv2-body">
        <div className="lv2-left">
          <div className="lv2-left-inner">
            <span className="lv2-eyebrow">01 · 개념 설명</span>
            <h3>{STEP.title}</h3>
            <p className="lv2-sub">{STEP.desc}</p>
            <Markdown text={STEP.body} />
          </div>
        </div>
        <div className="lv2-right">
          <div className="lv2-right-head">
            <span className="label">02 · 확인 질문</span>
            <span className="count">{STEP.questions.length}문항</span>
          </div>
          {STEP.questions.map((q, i) => (
            <QAPair key={q.id} idx={i} q={q} />
          ))}
        </div>
      </div>
      <Foot />
    </div>
  );
}

// ── 03 · 설명 + 질문 collapsible, 답변은 각 질문 아래 ────────────────────

const Chev = () => (
  <svg className="chev" viewBox="0 0 24 24" width="16" height="16"
       fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function Layout3() {
  const [openExplain, setOpenExplain] = React.useState(true);
  const [openQuestions, setOpenQuestions] = React.useState(true);

  return (
    <div className="lv-board">
      <PhaseBar />
      <div className="lv-body lv3-body">
        <header className="lv3-head">
          <span className="eyebrow">학습 진행 · 개념 1/4</span>
          <h3>{STEP.title}</h3>
        </header>

        <div className={"lv3-card" + (openExplain ? " is-open" : "")}>
          <button
            className="lv3-cardhead"
            type="button"
            onClick={() => setOpenExplain((v) => !v)}
            aria-expanded={openExplain}
          >
            <span className="badge">설명</span>
            <span className="ti">{STEP.desc}</span>
            <span className="sub">·  4분 분량</span>
            <Chev />
          </button>
          {openExplain && (
            <div className="lv3-cardbody">
              <Markdown text={STEP.body} />
            </div>
          )}
        </div>

        <div className={"lv3-card" + (openQuestions ? " is-open" : "")}>
          <button
            className="lv3-cardhead"
            type="button"
            onClick={() => setOpenQuestions((v) => !v)}
            aria-expanded={openQuestions}
          >
            <span className="badge">확인 질문</span>
            <span className="ti">짧게 이해 확인하기</span>
            <span className="sub">·  {STEP.questions.length}문항 · 1/{STEP.questions.length} 답변</span>
            <Chev />
          </button>
          {openQuestions && (
            <div className="lv3-cardbody">
              {STEP.questions.map((q, i) => (
                <div key={q.id} className="lv3-qrow">
                  <div className="q">
                    <span className="qn">Q{i + 1}</span>
                    <span className="qt">{q.q}</span>
                    <span className="qh">힌트 — {q.hint}</span>
                  </div>
                  <textarea
                    placeholder="자유롭게 적어주세요. 짧아도 좋아요."
                    defaultValue={i === 0 ? "동시성은 번갈아, 병렬성은 동시에." : ""}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Foot />
    </div>
  );
}

// ── 04 · 좌측 내비 + 수직 세션 (설명 → 질문 → 답변) ─────────────────────

function Layout4() {
  const sections = [
    { id: "explain", marker: "01", title: "개념 설명",   meta: "4분 분량",       state: "done" },
    { id: "q1",      marker: "02", title: "질문 1",      meta: "답변 완료",       state: "done" },
    { id: "q2",      marker: "03", title: "질문 2",      meta: "작성 중",         state: "active" },
    { id: "next",    marker: "04", title: "다음 개념",   meta: "스레드의 비용",   state: "todo" },
  ];

  const goTo = (id) => {
    const el = document.querySelector(`[data-lv4-anchor="${id}"]`);
    const root = el?.closest(".lv4-main");
    if (el && root) root.scrollTo({ top: el.offsetTop - 20, behavior: "smooth" });
  };

  return (
    <div className="lv-board">
      <PhaseBar />
      <div className="lv-body lv4-body">
        <nav className="lv4-nav">
          <div className="lv4-nav-eyebrow">{STEP.title}</div>
          <div className="lv4-nav-list">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={
                  "lv4-nav-item" +
                  (s.state === "active" ? " is-active" : "") +
                  (s.state === "done" ? " is-done" : "")
                }
                onClick={() => goTo(s.id)}
              >
                <span className="dot" />
                <span>
                  <span className="label">{s.title}</span>
                  <span className="meta">{s.marker} · {s.meta}</span>
                </span>
              </button>
            ))}
          </div>
        </nav>

        <div className="lv4-main">
          <section className="lv4-section" data-lv4-anchor="explain">
            <div className="lv4-section-head">
              <span className="marker">01 · 설명</span>
              <span className="t">{STEP.desc}</span>
              <span className="ht">4분 분량</span>
            </div>
            <div className="lv4-explain">
              <Markdown text={STEP.body} />
            </div>
          </section>

          {STEP.questions.map((q, i) => (
            <section key={q.id} className="lv4-section" data-lv4-anchor={"q" + (i + 1)}>
              <div className="lv4-section-head">
                <span className="marker">{String(i + 2).padStart(2, "0")} · 질문 {i + 1}</span>
                <span className="t">{q.q}</span>
                <span className="ht">힌트 — {q.hint}</span>
              </div>
              <QAPair idx={i} q={q} />
            </section>
          ))}
        </div>
      </div>
      <Foot />
    </div>
  );
}

Object.assign(window, { Layout1, Layout2, Layout3, Layout4 });
