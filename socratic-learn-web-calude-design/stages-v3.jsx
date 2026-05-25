// Socratic Learn v3 — stage components, data, and markdown renderer.

// ── Data ────────────────────────────────────────────────────────────────

const SAMPLE_CONCEPT = "코루틴이 왜 필요한지";

// 수준 확인: probing questions. The system estimates the level from these answers.
const PROBE_QUESTIONS = [
  {
    id: "p1",
    kind: "choice",
    q: "이 개념을 들었을 때 어떤 느낌이 드시나요?",
    options: [
      { value: 0, label: "단어 자체가 처음이에요" },
      { value: 1, label: "어디서 들어본 적은 있어요" },
      { value: 2, label: "어떤 맥락에서 쓰이는지 알아요" },
      { value: 3, label: "직접 다뤄본 적이 있어요" },
    ],
  },
  {
    id: "p2",
    kind: "multi",
    q: "연관 있어 보이는 단어를 모두 골라주세요",
    sub: "정확하지 않아도 괜찮아요. 감으로 골라도 됩니다.",
    options: [
      { value: "thread",    label: "스레드",      correct: true },
      { value: "suspend",   label: "suspend",     correct: true },
      { value: "async",     label: "async/await", correct: true },
      { value: "callback",  label: "콜백",         correct: true },
      { value: "index",     label: "DB 인덱스",    correct: false },
      { value: "shader",    label: "셰이더",       correct: false },
    ],
  },
  {
    id: "p3",
    kind: "text",
    q: "이 개념이 해결하려는 문제를 한 줄로 적어볼까요?",
    placeholder: "모르면 비워두셔도 괜찮아요",
  },
];

const LEVEL_LABELS = [
  "처음 만나는 단계",
  "단어를 알고 있는 단계",
  "맥락을 이해하는 단계",
  "직접 다뤄본 단계",
  "설명할 수 있는 단계",
];

function estimateLevel(probes) {
  let score = 0;
  if (typeof probes.p1 === "number") score += probes.p1 * 1.2;
  const picks = probes.p2 || [];
  const opts = PROBE_QUESTIONS[1].options;
  for (const v of picks) {
    const o = opts.find((o) => o.value === v);
    if (o) score += o.correct ? 0.8 : -1;
  }
  const len = (probes.p3 || "").trim().length;
  if (len > 8)  score += 0.5;
  if (len > 25) score += 0.7;
  return Math.max(0, Math.min(4, Math.round(score / 1.6)));
}

function levelReason(probes, level) {
  const parts = [];
  const p1 = PROBE_QUESTIONS[0].options.find((o) => o.value === probes.p1);
  if (p1) parts.push(`"${p1.label}"라고 답하셨고`);
  const picks = probes.p2 || [];
  const opts = PROBE_QUESTIONS[1].options;
  const correct = picks.filter((v) => opts.find((o) => o.value === v)?.correct).length;
  const wrong   = picks.length - correct;
  if (picks.length) {
    parts.push(`연관 단어 ${correct}개를 정확히 고르셨어요${wrong ? ` (관련 없는 단어 ${wrong}개 포함)` : ""}`);
  }
  if ((probes.p3 || "").trim().length > 8) parts.push("문장으로도 적어주셨네요");
  return parts.length ? parts.join(", ") + "." : "답변을 기준으로 추정한 결과입니다.";
}

// ── Concept steps (with markdown body + questions per step) ───────────────

const STEPS = [
  {
    id: 1,
    title: "동시성과 병렬성",
    desc: "헷갈리기 쉬운 두 단어부터",
    body:
`**동시성(concurrency)**은 여러 일을 *번갈아* 다루는 능력입니다. 한 번에 하나씩 처리하더라도, 여러 일을 진행 중인 상태로 둘 수 있다면 동시성이 있다고 봅니다.

**병렬성(parallelism)**은 여러 일을 *같은 시각*에 처리하는 것을 말합니다. 코어가 두 개 이상 필요해요.

비유로 보면, 한 명이 양손으로 번갈아 일을 하면 동시성, 두 명이 따로 하면 병렬성입니다. 코루틴은 이 중 **동시성**을 다루기 위한 도구입니다.`,
    questions: [
      { id: "1-1", q: "동시성과 병렬성의 차이를 한 줄로 정리해보세요.", hint: "코어 개수 관점에서" },
      { id: "1-2", q: "단일 코어 CPU에서도 동시성이 가능한 이유는?",   hint: "번갈아…"             },
    ],
  },
  {
    id: 2,
    title: "스레드의 비용",
    desc: "왜 더 가벼운 단위가 필요할까",
    body:
`스레드는 OS 단위의 작업 단위라서, 만들고 끄는 비용이 큽니다. 한 스레드는 자기 **콜스택**을 통째로 들고 있고, 메모리로는 보통 \`1MB\` 정도를 차지합니다.

수천 개의 일을 동시에 다루려면 스레드를 그만큼 만들어야 할까요? 그건 너무 비싼 선택이에요. *컨텍스트 스위칭* 비용도 무시할 수 없습니다.

그래서 더 가벼운 단위가 필요해졌습니다.`,
    questions: [
      { id: "2-1", q: "스레드 한 개가 차지하는 메모리는 보통 어느 정도인가요?", hint: "MB 단위" },
      { id: "2-2", q: "수천 개의 동시 작업이 필요할 때 스레드만 쓰면 어떤 문제가 생기나요?", hint: "메모리와 스위칭 비용" },
    ],
  },
  {
    id: 3,
    title: "일시중단 함수",
    desc: "코루틴의 핵심 도구 — suspend",
    body:
`\`suspend\` 함수는 *언제든 멈췄다가 이어서 실행될 수 있는* 함수입니다. 멈춤 지점은 컴파일러가 *상태 머신*으로 변환해 둡니다.

\`\`\`kotlin
suspend fun fetchUser(id: Int): User {
  val token = getToken()        // 멈춤 가능
  return api.user(id, token)    // 멈춤 가능
}
\`\`\`

코루틴이 멈춰 있는 동안 스레드는 다른 코루틴을 돌리면 됩니다. **스레드는 멈추지 않습니다.**`,
    questions: [
      { id: "3-1", q: "suspend 함수의 핵심 특징을 한 단어로 표현한다면?", hint: "멈춤 …" },
    ],
  },
  {
    id: 4,
    title: "코루틴이 가벼운 이유",
    desc: "콜스택 대신 상태 객체",
    body:
`스레드처럼 콜스택을 통째로 들고 있는 대신, 코루틴은 **자기 상태를 작은 객체 하나**로 들고 갑니다.

그래서 한 스레드 위에서 *수천 개*의 코루틴을 굴릴 수 있어요. 새 스레드를 만들지 않고도 동시성을 얻는 것이 코루틴의 본질입니다.`,
    questions: [
      { id: "4-1", q: "코루틴이 자기 상태를 어떻게 들고 있나요?",          hint: "단어 하나로도 OK" },
      { id: "4-2", q: "한 스레드 위에 코루틴을 여러 개 둘 수 있는 이유는?", hint: "콜스택 vs …" },
    ],
  },
];

// ── Markdown renderer (subset: **bold**, *em*, `code`, ```code blocks```) ─

function renderInline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith("**")) parts.push(<strong key={key++}>{s.slice(2, -2)}</strong>);
    else if (s.startsWith("*")) parts.push(<em key={key++}>{s.slice(1, -1)}</em>);
    else if (s.startsWith("`")) parts.push(<code key={key++} className="md-code">{s.slice(1, -1)}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let code = null;
  let para = [];
  const flush = () => { if (para.length) { blocks.push({ kind: "p", text: para.join(" ") }); para = []; } };
  for (const line of lines) {
    if (line.startsWith("```")) {
      flush();
      if (code) { blocks.push({ kind: "code", lang: code.lang, text: code.lines.join("\n") }); code = null; }
      else      { code = { lang: line.slice(3).trim(), lines: [] }; }
      continue;
    }
    if (code) { code.lines.push(line); continue; }
    if (line.trim() === "") { flush(); continue; }
    para.push(line.trim());
  }
  flush();
  return (
    <div className="md-body">
      {blocks.map((b, i) => {
        if (b.kind === "code") {
          return (
            <pre key={i} className="code-block">
              {b.lang && <span className="code-lang">{b.lang}</span>}
              <code>{b.text}</code>
            </pre>
          );
        }
        return <p key={i}>{renderInline(b.text)}</p>;
      })}
    </div>
  );
}

// ── Shared shell ──────────────────────────────────────────────────────────

function StageShell({ eyebrow, title, sub, children, prev, prevLabel = "이전", next, nextLabel = "다음 →", nextDisabled }) {
  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">{eyebrow}</div>
        <h2 className="stage-title">{title}</h2>
        {sub && <p className="stage-sub">{sub}</p>}
      </header>
      <div className="stage-body">{children}</div>
      <div className="stage-actions">
        {prev ? (
          <button className="btn-ghost" type="button" onClick={prev}>← {prevLabel}</button>
        ) : <span />}
        <span className="grow" />
        <button className="btn-holo" type="button" onClick={next} disabled={nextDisabled}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}

// ── 01 · 수준 확인 (진단 질문 + 결과) ─────────────────────────────────────

function ProbeChoice({ p, value, onChange }) {
  return (
    <div className="probe-row">
      <div className="probe-q">{p.q}</div>
      {p.sub && <div className="probe-sub">{p.sub}</div>}
      <div className="probe-choices">
        {p.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={"probe-choice" + (value === o.value ? " is-active" : "")}
            onClick={() => onChange(o.value)}
          >
            <span className="probe-radio" aria-hidden="true" />
            <span className="probe-label">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProbeMulti({ p, value, onToggle }) {
  const picked = value || [];
  return (
    <div className="probe-row">
      <div className="probe-q">{p.q}</div>
      {p.sub && <div className="probe-sub">{p.sub}</div>}
      <div className="probe-chips">
        {p.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={"probe-chip" + (picked.includes(o.value) ? " is-active" : "")}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProbeText({ p, value, onChange }) {
  return (
    <div className="probe-row">
      <div className="probe-q">{p.q}</div>
      <textarea
        className="probe-text"
        rows={2}
        placeholder={p.placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StageProbe({ concept, probes, setProbes, estimatedLevel, setEstimatedLevel, onPrev, onNext }) {
  const allAnswered = (
    typeof probes.p1 === "number" &&
    Array.isArray(probes.p2)
  );
  const submitted = estimatedLevel != null;

  const submit = () => {
    const lvl = estimateLevel(probes);
    setEstimatedLevel(lvl);
  };

  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">01 · 수준 확인</div>
        <h2 className="stage-title">{concept}, 몇 가지만 짧게 여쭐게요</h2>
        <p className="stage-sub">답을 보고 수준을 추정해서 단계와 깊이를 맞춰드릴게요</p>
      </header>

      <div className="stage-body">
        <div className="probe-list">
          {PROBE_QUESTIONS.map((p) => {
            const v = probes[p.id];
            if (p.kind === "choice") {
              return (
                <ProbeChoice
                  key={p.id}
                  p={p}
                  value={v}
                  onChange={(nv) => setProbes((prev) => ({ ...prev, [p.id]: nv }))}
                />
              );
            }
            if (p.kind === "multi") {
              return (
                <ProbeMulti
                  key={p.id}
                  p={p}
                  value={v}
                  onToggle={(val) =>
                    setProbes((prev) => {
                      const picked = prev[p.id] || [];
                      const next = picked.includes(val)
                        ? picked.filter((x) => x !== val)
                        : [...picked, val];
                      return { ...prev, [p.id]: next };
                    })
                  }
                />
              );
            }
            if (p.kind === "text") {
              return (
                <ProbeText
                  key={p.id}
                  p={p}
                  value={v}
                  onChange={(nv) => setProbes((prev) => ({ ...prev, [p.id]: nv }))}
                />
              );
            }
            return null;
          })}
        </div>

        {submitted && (
          <div className="probe-result">
            <div className="pr-head">
              <span className="pr-eyebrow">수준 추정 결과</span>
              <span className="pr-level">L{estimatedLevel} · {LEVEL_LABELS[estimatedLevel]}</span>
            </div>
            <p className="pr-reason">{levelReason(probes, estimatedLevel)}</p>
            <p className="pr-note">이 추정에 맞춰 <strong>{STEPS.length}단계</strong> 코스를 짜드릴게요. 다음 화면에서 확인할 수 있어요.</p>
          </div>
        )}
      </div>

      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={onPrev}>← 개념 다시 입력</button>
        <span className="grow" />
        {!submitted ? (
          <button className="btn-holo" type="button" onClick={submit} disabled={!allAnswered}>
            제출하고 수준 보기 →
          </button>
        ) : (
          <button className="btn-holo" type="button" onClick={onNext}>
            단계 만들기 →
          </button>
        )}
      </div>
    </section>
  );
}

// ── 02 · 단계 제시 ────────────────────────────────────────────────────────

function StageRoadmap({ concept, level, onPrev, onNext }) {
  return (
    <StageShell
      eyebrow="02 · 단계 제시"
      title={<>{concept}, 이렇게 풀어드릴게요</>}
      sub={`${LEVEL_LABELS[level ?? 2]} 기준 · ${STEPS.length}개 개념 · 각 개념마다 짧은 확인 질문`}
      prev={onPrev} prevLabel="수준 확인 다시 보기"
      next={onNext} nextLabel="첫 개념 시작 →"
    >
      <ol className="roadmap-list">
        {STEPS.map((step, i) => (
          <li key={step.id} className="roadmap-row">
            <span className="rm-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="rm-body">
              <span className="rm-title">{step.title}</span>
              <span className="rm-desc">{step.desc}</span>
            </span>
            <span className="rm-meta">{step.questions.length}문항</span>
          </li>
        ))}
      </ol>
    </StageShell>
  );
}

// ── 03 · 개념 설명 ────────────────────────────────────────────────────────

function StageExplain({ stepIdx, onPrev, onNext }) {
  const step = STEPS[stepIdx];
  return (
    <StageShell
      eyebrow={`03 · 개념 설명 · 개념 ${stepIdx + 1}/${STEPS.length}`}
      title={step.title}
      sub={step.desc}
      prev={onPrev} prevLabel={stepIdx === 0 ? "단계 다시 보기" : "이전 개념"}
      next={onNext} nextLabel="확인 질문 보기 →"
    >
      <article className="explain">
        <Markdown text={step.body} />
      </article>
    </StageShell>
  );
}

// ── 04 · 확인 질문 (preview) ─────────────────────────────────────────────

function StageQuestions({ stepIdx, onPrev, onNext }) {
  const step = STEPS[stepIdx];
  return (
    <StageShell
      eyebrow={`04 · 확인 질문 · 개념 ${stepIdx + 1}/${STEPS.length}`}
      title={<>{step.title}, 이해 확인할게요</>}
      sub={`${step.questions.length}개 질문 · 한 문장이면 충분해요`}
      prev={onPrev} prevLabel="설명 다시 보기"
      next={onNext} nextLabel="답변 시작 →"
    >
      <ol className="q-preview">
        {step.questions.map((q, i) => (
          <li key={q.id}>
            <span className="qn">Q{i + 1}</span>
            <span className="qt">
              <span className="qq">{q.q}</span>
              <span className="qh">힌트 — {q.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="q-tip">모르면 <b>모르겠어요</b>를 눌러도 괜찮아요. 그 질문은 다음 학습에서 다시 만나게 됩니다.</p>
    </StageShell>
  );
}

// ── 05 · 답변 ─────────────────────────────────────────────────────────────

function StageAnswering({ stepIdx, answers, setAnswers, skips, setSkips, onPrev, onStepDone }) {
  const step = STEPS[stepIdx];
  const [qIdx, setQIdx] = React.useState(0);
  React.useEffect(() => { setQIdx(0); }, [stepIdx]);

  const q = step.questions[qIdx];
  const isLast = qIdx === step.questions.length - 1;
  const filled = (answers[q.id] || "").trim().length > 0 || skips[q.id];

  const go = (delta) => {
    const next = qIdx + delta;
    if (next < 0) onPrev();
    else if (next >= step.questions.length) onStepDone();
    else setQIdx(next);
  };
  const skip = () => {
    setSkips({ ...skips, [q.id]: true });
    setAnswers({ ...answers, [q.id]: "" });
    if (isLast) onStepDone();
    else setQIdx(qIdx + 1);
  };

  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">
          05 · 답변 · 개념 {stepIdx + 1}/{STEPS.length} · Q{qIdx + 1}/{step.questions.length}
        </div>
        <h2 className="stage-title q-prompt">{q.q}</h2>
        <p className="stage-sub">힌트 — {q.hint}</p>
      </header>

      <div className="stage-body">
        <textarea
          key={q.id}
          className="q-answer"
          placeholder="자유롭게 적어주세요. 짧아도 좋아요."
          autoFocus
          value={answers[q.id] || ""}
          onChange={(e) => {
            setAnswers({ ...answers, [q.id]: e.target.value });
            if (skips[q.id]) setSkips({ ...skips, [q.id]: false });
          }}
          rows={4}
        />
        <div className="q-progress" aria-label={`${qIdx + 1} / ${step.questions.length}`}>
          {step.questions.map((_, i) => (
            <i key={i} className={i < qIdx ? "is-done" : i === qIdx ? "is-curr" : ""} />
          ))}
        </div>
      </div>

      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={() => go(-1)}>
          ← {qIdx === 0 ? "설명 다시 보기" : "이전 질문"}
        </button>
        <span className="grow" />
        <button className="btn-text" type="button" onClick={skip}>모르겠어요</button>
        <button className="btn-holo" type="button" onClick={() => go(1)} disabled={!filled}>
          {isLast ? (stepIdx === STEPS.length - 1 ? "학습 마치기" : "다음 개념으로") : "다음 질문"} →
        </button>
      </div>
    </section>
  );
}

// ── 06 · 완료 ─────────────────────────────────────────────────────────────

function StageDone({ concept, level, answers, skips, onPrev, onRestart }) {
  const allQuestions = STEPS.flatMap((s) => s.questions);
  const answered = allQuestions.filter((q) => (answers[q.id] || "").trim().length > 0).length;
  const skipped  = allQuestions.filter((q) => skips[q.id]).length;
  return (
    <StageShell
      eyebrow="완료"
      title={<>잘 마쳤어요</>}
      sub={`${concept} · ${STEPS.length}개 개념을 모두 마쳤습니다`}
      prev={onPrev} prevLabel="마지막 답변 다시 보기"
      next={onRestart} nextLabel="새 개념 시작 →"
    >
      <div className="done-card">
        <div className="done-row">
          <span className="done-k">시작 수준</span>
          <span className="done-v">L{level ?? "—"} · {LEVEL_LABELS[level ?? 2]}</span>
        </div>
        <div className="done-row">
          <span className="done-k">답변</span>
          <span className="done-v">{answered} / {allQuestions.length} 문항</span>
        </div>
        <div className="done-row">
          <span className="done-k">모르겠어요</span>
          <span className="done-v">{skipped} 문항 · 다음 학습에서 다시 만나요</span>
        </div>
        <div className="done-row">
          <span className="done-k">다음 추천</span>
          <span className="done-v">Dispatcher 와 컨텍스트</span>
        </div>
      </div>
    </StageShell>
  );
}

// ── exports ───────────────────────────────────────────────────────────────

Object.assign(window, {
  StageProbe, StageRoadmap, StageExplain, StageQuestions, StageAnswering, StageDone,
  PROBE_QUESTIONS, STEPS, LEVEL_LABELS, SAMPLE_CONCEPT,
  estimateLevel, levelReason,
});
