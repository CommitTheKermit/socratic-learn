// Branch Selection — Slice 3 시안 모음
// 3 variants of BranchSelector, 3 variants of ProgressBar inserted-chip, 2 variants of BranchErrorCard.

// ── Sample data (matches the BranchOption / EvaluationResponse shape) ──
const EVAL_TEXT_MD = `**부분적으로 정답에 가깝습니다.** 동시성과 병렬성을 *코어 수* 로 구분한 것은 정확하지만, “스레드는 멈추지 않는다”는 부분은 코루틴 맥락이 빠져 있어 보강이 필요해 보여요.`;

const SAMPLE_BRANCHES = [
  {
    label: "다음 로드맵 — 일시중단 함수",
    type: "roadmap_next",
    isRecommended: true, // merged case
    stageContent: {
      title: "일시중단 함수",
      desc: "코루틴의 핵심 도구 — suspend",
      body: "", questions: [{ id: "3-1", q: "" }],
      id: 3,
    },
  },
  {
    label: "스레드와 비동기의 관계를 다시 보기",
    type: "additional",
    isRecommended: false,
    stageContent: {
      title: "스레드와 비동기",
      desc: "왜 스레드는 멈추지 않는가, 라는 질문에서 출발",
      body: "", questions: [{ id: "x", q: "" }],
      id: 99,
    },
  },
  {
    label: "콜백 지옥 → async/await 진화 흐름",
    type: "additional",
    isRecommended: false,
    stageContent: {
      title: "콜백에서 async/await 까지",
      desc: "비동기 표현의 진화를 한 흐름으로",
      body: "", questions: [{ id: "y", q: "" }],
      id: 100,
    },
  },
  {
    label: "여기서 학습을 마치기",
    type: "exit",
    isRecommended: false,
    stageContent: null,
  },
];

// Un-merged variant (separate roadmap_next + ai_recommended)
const SAMPLE_BRANCHES_UNMERGED = [
  {
    label: "다음 로드맵 — 일시중단 함수",
    type: "roadmap_next",
    isRecommended: false,
    stageContent: {
      title: "일시중단 함수",
      desc: "코루틴의 핵심 도구 — suspend",
      body: "", questions: [{ id: "3-1", q: "" }],
      id: 3,
    },
  },
  {
    label: "스레드 비용을 한 번 더 짚고 가기",
    type: "ai_recommended",
    isRecommended: true,
    stageContent: {
      title: "스레드의 비용 (보강)",
      desc: "“스레드가 멈추지 않는다”의 의미를 정확히 잡기",
      body: "", questions: [{ id: "z", q: "" }],
      id: 98,
    },
  },
  {
    label: "콜백 지옥 → async/await 진화 흐름",
    type: "additional",
    isRecommended: false,
    stageContent: {
      title: "콜백에서 async/await 까지",
      desc: "비동기 표현의 진화를 한 흐름으로",
      body: "", questions: [{ id: "y", q: "" }],
      id: 100,
    },
  },
  {
    label: "여기서 학습을 마치기",
    type: "exit",
    isRecommended: false,
    stageContent: null,
  },
];

const TYPE_LABEL = {
  roadmap_next: "로드맵 다음",
  ai_recommended: "AI 추천",
  additional: "추가 분기",
  exit: "학습 종료",
};

// ── inline icons ──
const SvgChev = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const SvgArrow = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
  </svg>
);
const SvgSpark = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v4" /><path d="M12 17v4" />
    <path d="M3 12h4" /><path d="M17 12h4" />
    <path d="m6 6 2.5 2.5" /><path d="m15.5 15.5 2.5 2.5" />
    <path d="m18 6-2.5 2.5" /><path d="m8.5 15.5-6 6" />
  </svg>
);
const SvgExit = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6h11v12H9" /><path d="m13 9 3 3-3 3" /><path d="M4 12h12" />
  </svg>
);
const SvgAlert = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 2 20h20Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" />
  </svg>
);
const SvgRetry = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.8"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
  </svg>
);
const SvgDot = () => (
  <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
    <circle cx="3" cy="3" r="3" fill="currentColor" />
  </svg>
);
const SvgIcon = ({ type, size = 14 }) => {
  if (type === "roadmap_next") return <SvgArrow size={size} />;
  if (type === "ai_recommended") return <SvgSpark size={size} />;
  if (type === "additional") return <SvgDot />;
  return <SvgExit size={size} />;
};

// ── frame wrapper (eval text + section head) ───────────────────────────────
function BvFrame({ phase = "branch", children, title, eyebrow, sub }) {
  return (
    <div className="bv-frame">
      <div className="bv-phasestrip" aria-hidden="true">
        <div className="pc done"><div className="bar"><i /></div><span>01 수준</span></div>
        <div className="pc done"><div className="bar"><i /></div><span>02 단계</span></div>
        <div className={"pc " + (phase === "branch" ? "curr" : "done")}>
          <div className="bar"><i /></div><span>03 학습 · 분기</span>
        </div>
        <div className="pc"><div className="bar"><i /></div><span>04 완료</span></div>
      </div>
      <div className="stage-eyebrow">{eyebrow}</div>
      <h2 className="stage-title">{title}</h2>
      {sub && <p className="stage-sub">{sub}</p>}
      {children}
    </div>
  );
}

function EvalCard({ text }) {
  // tiny inline md (** / *) renderer
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith("**")) parts.push(<strong key={k++}>{s.slice(2, -2)}</strong>);
    else parts.push(<em key={k++}>{s.slice(1, -1)}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <div className="bv-eval">
      <div className="e-eyebrow">평가 결과 · 개념 2/4</div>
      <p className="e-body">{parts}</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// VARIANT A — 풀폭 카드 리스트
// ────────────────────────────────────────────────────────────────────────
function BranchSelectorA({ options }) {
  return (
    <BvFrame
      eyebrow="06 · 다음 분기 선택"
      title={<>다음으로 어디로 가볼까요?</>}
      sub="평가 결과를 보고 가장 알맞은 길을 골라주세요"
    >
      <EvalCard text={EVAL_TEXT_MD} />
      <div className="bv-section-head">
        <span className="h">다음 학습 분기</span>
        <span className="meta">{options.length}개 옵션</span>
      </div>
      <div className="bvA-list">
        {options.map((o, i) => {
          const exit = o.type === "exit";
          return (
            <button
              key={i}
              className={
                "bvA-card" +
                (o.isRecommended ? " is-rec" : "") +
                (exit ? " is-exit" : "")
              }
              type="button"
            >
              <span className={"bvA-icon" + (o.isRecommended ? " is-holo" : "")}>
                <SvgIcon type={o.type} />
              </span>
              <span className="bvA-body">
                <span className="bvA-label">
                  {o.label}
                  {o.isRecommended && <span className="bvA-rec">추천</span>}
                </span>
                <span className="bvA-preview">
                  {exit
                    ? "여기까지의 학습을 정리하고 마치기"
                    : `${o.stageContent.title} · ${o.stageContent.desc}`}
                </span>
              </span>
              <span className="bvA-type">
                <span className="bvA-chev"><SvgChev /></span>
              </span>
            </button>
          );
        })}
      </div>
    </BvFrame>
  );
}

// ────────────────────────────────────────────────────────────────────────
// VARIANT B — 추천 히어로 + 보조 그리드
// ────────────────────────────────────────────────────────────────────────
function BranchSelectorB({ options }) {
  const rec = options.find((o) => o.isRecommended) || options[0];
  const rest = options.filter((o) => o !== rec && o.type !== "exit");
  const exit = options.find((o) => o.type === "exit");
  return (
    <BvFrame
      eyebrow="06 · 다음 분기 선택"
      title={<>다음으로 어디로 가볼까요?</>}
      sub="평가 결과를 보고 가장 알맞은 길을 골라주세요"
    >
      <EvalCard text={EVAL_TEXT_MD} />
      <div className="bv-section-head">
        <span className="h">추천 분기</span>
        <span className="meta">머지된 다음 단계</span>
      </div>
      <button className="bvB-hero" type="button">
        <div className="bvB-hero-top">
          <span className="bvB-tag"><SvgSpark size={11} /> 추천</span>
          <span className="bvB-hero-type">{TYPE_LABEL[rec.type]}</span>
        </div>
        <div className="bvB-hero-label">{rec.label}</div>
        <div className="bvB-hero-preview">
          {rec.stageContent
            ? `${rec.stageContent.title} — ${rec.stageContent.desc}`
            : "여기서 학습을 마치기"}
        </div>
        <div className="bvB-hero-cta">
          이 길로 가기 <SvgArrow size={12} />
        </div>
      </button>

      <div className="bv-section-head">
        <span className="h">다른 분기</span>
        <span className="meta">{rest.length}개</span>
      </div>
      <div className="bvB-grid">
        {rest.map((o, i) => (
          <button key={i} className={"bvB-tile" + (o.isRecommended ? " is-rec" : "")} type="button">
            {o.isRecommended && <span className="bvB-tile-rec">추천</span>}
            <span className="bvB-tile-type">{TYPE_LABEL[o.type]}</span>
            <span className="bvB-tile-label">{o.stageContent?.title || o.label}</span>
            <span className="bvB-tile-preview">
              {o.stageContent?.desc || o.label}
            </span>
          </button>
        ))}
      </div>

      {exit && (
        <button className="bvB-exit" type="button">
          <SvgExit size={12} /> 여기서 학습을 마치기
        </button>
      )}
    </BvFrame>
  );
}

// ────────────────────────────────────────────────────────────────────────
// VARIANT C — 결정 레일 (좌측 도트로 타입 표시)
// ────────────────────────────────────────────────────────────────────────
function BranchSelectorC({ options }) {
  return (
    <BvFrame
      eyebrow="06 · 다음 분기 선택"
      title={<>다음으로 어디로 가볼까요?</>}
      sub="평가 결과를 보고 가장 알맞은 길을 골라주세요"
    >
      <EvalCard text={EVAL_TEXT_MD} />
      <div className="bv-section-head">
        <span className="h">다음 학습 분기</span>
        <span className="meta">{options.length}개 옵션 · 화살표로 이동</span>
      </div>
      <div className="bvC-list">
        {options.map((o, i) => {
          const exit = o.type === "exit";
          return (
            <button
              key={i}
              type="button"
              className={
                "bvC-row" +
                (o.isRecommended ? " is-rec" : "") +
                (exit ? " is-exit" : "")
              }
            >
              <span className="bvC-dot" aria-hidden="true" />
              <span className="bvC-body">
                <span className="bvC-head">
                  <span className="bvC-label">{o.label}</span>
                  <span className="bvC-type">{TYPE_LABEL[o.type]}</span>
                </span>
                <span className="bvC-preview">
                  {exit
                    ? "여기까지의 학습을 정리하고 마치기"
                    : `${o.stageContent.title} · ${o.stageContent.desc}`}
                </span>
              </span>
              {o.isRecommended ? (
                <span className="bvC-rec">추천</span>
              ) : (
                <span style={{ color: "var(--fg-faint)" }}><SvgChev /></span>
              )}
            </button>
          );
        })}
      </div>
    </BvFrame>
  );
}

// ────────────────────────────────────────────────────────────────────────
// PROGRESS BAR — 동적 칩 삽입 시안
// ────────────────────────────────────────────────────────────────────────
const STEPS_WITH_INSERT = [
  { n: "01", name: "동시성 / 병렬성", state: "done" },
  { n: "02", name: "스레드 비용",      state: "done" },
  { n: "2-1", name: "보강 — 스레드의 의미", state: "curr", inserted: true },
  { n: "03", name: "일시중단 함수",     state: "todo" },
  { n: "04", name: "코루틴이 가벼운 이유", state: "todo" },
];

function ProgressBarVariant({ kind }) {
  // kind: "A" | "B" | "C"
  const cls = `bv-steps bv-step${kind}`;
  return (
    <div className="bv-pbar">
      <div className="legend">
        ProgressBar · 시안 {kind} · 분기 삽입 칩 ({kind === "A" ? "점선 보더" : kind === "B" ? "분기 들여쓰기 + 색상" : "코너 마커"})
      </div>
      <div className={cls}>
        {STEPS_WITH_INSERT.map((s, i) => {
          const stateCls = " is-" + s.state + (s.inserted ? " is-inserted" : "");
          let fillPct = s.state === "done" ? 100 : s.state === "curr" ? 50 : 0;
          return (
            <div key={i} className={"seg" + stateCls}>
              <span className="track"><span className="fill" style={{ width: fillPct + "%" }} /></span>
              <span className="label">
                <strong style={{ fontWeight: 600, marginRight: 4 }}>{s.n}</strong>{s.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// ERROR CARD — variants
// ────────────────────────────────────────────────────────────────────────
function BranchErrorCardA({ message = "분기 옵션을 불러오는 중에 응답을 이해하지 못했어요.", retryCount = 2 }) {
  return (
    <BvFrame
      eyebrow="06 · 다음 분기 선택 · 오류"
      title={<>다시 한 번 시도해볼까요?</>}
      sub="LLM 응답을 분기 형식으로 받지 못했습니다"
    >
      <div className="bvE-card">
        <div className="bvE-head">
          <span className="bvE-icon"><SvgAlert /></span>
          <div className="bvE-headtxt">
            <div className="bvE-title">분기 옵션을 만들지 못했어요</div>
            <div className="bvE-retries">재시도 {retryCount}회</div>
          </div>
        </div>
        <p className="bvE-msg">{message}</p>
        <details className="bvE-details">
          <summary>기술적 상세 보기</summary>
          <pre>{`ParseError: expected JSON object at position 412
  → branchOptions field missing
  raw: "...{ \\"evaluationText\\": \\"부분적..."`}</pre>
        </details>
        <div className="bvE-actions">
          <button className="bv-btn-primary" type="button">
            <SvgRetry /> 다시 시도
          </button>
          <button className="bv-btn-ghost" type="button">학습 종료</button>
        </div>
      </div>
    </BvFrame>
  );
}

function BranchErrorCardB({ retryCount = 1 }) {
  return (
    <BvFrame
      eyebrow="06 · 다음 분기 선택 · 오류"
      title={<>다음 분기를 만드는 중에 막혔어요</>}
      sub="짧고 가벼운 인라인 알림 — 평가 결과는 그대로 두고 위쪽에 띄움"
    >
      <EvalCard text={EVAL_TEXT_MD} />
      <div className="bvE2-row">
        <span className="ic"><SvgAlert size={14} /></span>
        <span className="tx">
          <span className="t">분기 옵션을 만들지 못했어요</span>
          <span className="s">응답이 분기 형식이 아니에요 · 재시도 {retryCount}회</span>
        </span>
        <span className="acts">
          <button className="bv-btn-ghost" type="button">종료</button>
          <button className="bv-btn-primary" type="button">
            <SvgRetry /> 다시 시도
          </button>
        </span>
      </div>
      <details className="bvE-details">
        <summary>기술적 상세 보기</summary>
        <pre>{`ParseError: branchOptions[].label missing
  raw: "...{ \\"branchOptions\\": [ { \\"type\\": \\"roadmap_next\\", ..."`}</pre>
      </details>
    </BvFrame>
  );
}

// ────────────────────────────────────────────────────────────────────────
// DIALOG VARIANTS — A 카드 리스트를 다이얼로그로 띄우는 형태
// ────────────────────────────────────────────────────────────────────────
const SvgClose = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 6 18 18" /><path d="M18 6 6 18" />
  </svg>
);

// Faux underlying page (answering stage just submitted)
function FakeAnsweringContext({ blurred = true }) {
  return (
    <div className={"dlg-ctx" + (blurred ? " is-blurred" : "")}>
      <div className="bv-phasestrip" aria-hidden="true">
        <div className="pc done"><div className="bar"><i /></div><span>01 수준</span></div>
        <div className="pc done"><div className="bar"><i /></div><span>02 단계</span></div>
        <div className="pc curr"><div className="bar"><i /></div><span>03 학습 · 답변</span></div>
        <div className="pc"><div className="bar"><i /></div><span>04 완료</span></div>
      </div>
      <div className="stage-eyebrow">05 · 답변 · 개념 2/4 · Q1/2</div>
      <h2 className="stage-title">스레드 한 개가 차지하는 메모리는 보통 어느 정도인가요?</h2>
      <p className="stage-sub">힌트 — MB 단위</p>
      <div className="fake-answer">
        대략 1MB 정도이고, OS 단위 작업이라 컨텍스트 스위칭 비용도 큽니다. 그래서 수천 개 단위의 동시 작업을 다루기엔 너무 비싼 선택입니다.
      </div>
      <div className="fake-actions">
        <button type="button" className="fake-btn-ghost">← 이전 질문</button>
        <button type="button" className="fake-btn-holo">다음 질문 →</button>
      </div>
    </div>
  );
}

// Inner content (shared by all three dialog shells)
function DialogContent({ options, onClose }) {
  return (
    <>
      <div className="dlg-head">
        <div className="ht">
          <span className="eyebrow">평가 완료 · 다음 분기 선택</span>
          <h3 className="title">다음으로 어디로 가볼까요?</h3>
          <p className="sub">방금 답변을 평가했어요. 알맞은 길을 골라주세요.</p>
        </div>
        <button className="dlg-close" type="button" aria-label="닫기" onClick={onClose}>
          <SvgClose />
        </button>
      </div>
      <div className="dlg-body">
        <EvalCard text={EVAL_TEXT_MD} />
        <div className="bv-section-head">
          <span className="h">다음 학습 분기</span>
          <span className="meta">{options.length}개 옵션</span>
        </div>
        <div className="bvA-list">
          {options.map((o, i) => {
            const exit = o.type === "exit";
            return (
              <button
                key={i}
                className={
                  "bvA-card" +
                  (o.isRecommended ? " is-rec" : "") +
                  (exit ? " is-exit" : "")
                }
                type="button"
              >
                <span className={"bvA-icon" + (o.isRecommended ? " is-holo" : "")}>
                  <SvgIcon type={o.type} />
                </span>
                <span className="bvA-body">
                  <span className="bvA-label">
                    {o.label}
                    {o.isRecommended && <span className="bvA-rec">추천</span>}
                  </span>
                  <span className="bvA-preview">
                    {exit
                      ? "여기까지의 학습을 정리하고 마치기"
                      : `${o.stageContent.title} · ${o.stageContent.desc}`}
                  </span>
                </span>
                <span className="bvA-chev"><SvgChev /></span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// — 1) 중앙 모달 —
function DialogCenter({ options }) {
  return (
    <div className="dlg-frame">
      <FakeAnsweringContext />
      <div className="dlg-backdrop" aria-hidden="true" />
      <div className="dlg-center">
        <div className="dlg-surface">
          <DialogContent options={options} />
        </div>
      </div>
    </div>
  );
}

// — 2) 바텀 시트 —
function DialogSheet({ options }) {
  return (
    <div className="dlg-frame">
      <FakeAnsweringContext />
      <div className="dlg-backdrop" aria-hidden="true" />
      <div className="dlg-sheet">
        <div className="dlg-surface">
          <span className="grabber" aria-hidden="true" />
          <DialogContent options={options} />
        </div>
      </div>
    </div>
  );
}

// — 3) 우측 슬라이드오버 —
function DialogSlide({ options }) {
  return (
    <div className="dlg-frame">
      <FakeAnsweringContext />
      <div className="dlg-backdrop" aria-hidden="true" />
      <div className="dlg-slide">
        <div className="dlg-surface">
          <DialogContent options={options} />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Canvas root
// ────────────────────────────────────────────────────────────────────────
function App() {
  return (
    <DesignCanvas>
      <DCSection
        id="branch-dialog"
        title="분기 선택 다이얼로그 (A 카드 리스트 기반)"
        subtitle="페이지를 그대로 두고 평가 직후 다이얼로그로 띄우는 형태 — 답변 화면이 뒤로 흐려지며 컨텍스트 유지"
      >
        <DCArtboard id="dlg-center" label="① 중앙 모달 · 560w" width={760} height={780}>
          <DialogCenter options={SAMPLE_BRANCHES} />
        </DCArtboard>
        <DCArtboard id="dlg-sheet" label="② 바텀 시트 · 70% 높이" width={760} height={780}>
          <DialogSheet options={SAMPLE_BRANCHES} />
        </DCArtboard>
        <DCArtboard id="dlg-slide" label="③ 우측 슬라이드오버 · 460w" width={760} height={780}>
          <DialogSlide options={SAMPLE_BRANCHES} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="branch-selector"
        title="분기 선택 (BranchSelector) · 이전 시안"
        subtitle="페이지 stage 형태 — 참고용"
      >
        <DCArtboard id="bs-a-merged" label="A · 풀폭 카드 리스트 (머지된 케이스)" width={680} height={920}>
          <BranchSelectorA options={SAMPLE_BRANCHES} />
        </DCArtboard>
        <DCArtboard id="bs-a-unmerged" label="A · 풀폭 카드 리스트 (분리 케이스)" width={680} height={960}>
          <BranchSelectorA options={SAMPLE_BRANCHES_UNMERGED} />
        </DCArtboard>
        <DCArtboard id="bs-b" label="B · 추천 히어로 + 그리드" width={680} height={1020}>
          <BranchSelectorB options={SAMPLE_BRANCHES_UNMERGED} />
        </DCArtboard>
        <DCArtboard id="bs-c" label="C · 결정 레일 (도트 인덱스)" width={680} height={900}>
          <BranchSelectorC options={SAMPLE_BRANCHES_UNMERGED} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="progress-bar"
        title="ProgressBar — 분기 칩 동적 삽입"
        subtitle="기존 4-phase bar 와 호환되면서 inserted: true 인 step 을 시각적으로 구분"
      >
        <DCArtboard id="pb-a" label="A · 점선 보더 + ↳ prefix" width={760} height={150}>
          <div style={{ padding: 16, background: "var(--bg)" }}>
            <ProgressBarVariant kind="A" />
          </div>
        </DCArtboard>
        <DCArtboard id="pb-b" label="B · 들여쓰기 + 그라데이션 채움" width={760} height={150}>
          <div style={{ padding: 16, background: "var(--bg)" }}>
            <ProgressBarVariant kind="B" />
          </div>
        </DCArtboard>
        <DCArtboard id="pb-c" label="C · 좌측 코너 마커 (분기 표시)" width={760} height={150}>
          <div style={{ padding: 16, background: "var(--bg)" }}>
            <ProgressBarVariant kind="C" />
          </div>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="branch-error"
        title="BranchErrorCard"
        subtitle="LLM 파싱 실패 / 네트워크 오류 시 표시"
      >
        <DCArtboard id="be-a" label="A · 미니멀 센터 카드 (전용 stage)" width={680} height={720}>
          <BranchErrorCardA />
        </DCArtboard>
        <DCArtboard id="be-b" label="B · 인라인 알림 (평가 위에 띄움)" width={680} height={720}>
          <BranchErrorCardB />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
