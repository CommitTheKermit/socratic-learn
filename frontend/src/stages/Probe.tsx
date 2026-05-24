import {
  LEVEL_LABELS,
  PROBE_QUESTIONS,
  STEPS,
  estimateLevel,
  levelReason,
  type ProbeAnswers,
  type ProbeChoiceQ,
  type ProbeMultiQ,
  type ProbeTextQ,
} from "./data";

interface Props {
  concept: string;
  probes: ProbeAnswers;
  setProbes: (updater: (prev: ProbeAnswers) => ProbeAnswers) => void;
  estimatedLevel: number | null;
  setEstimatedLevel: (v: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

function ChoiceRow({
  p,
  value,
  onChange,
}: {
  p: ProbeChoiceQ;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
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
            <span className="probe-radio" aria-hidden />
            <span className="probe-label">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiRow({
  p,
  value,
  onToggle,
}: {
  p: ProbeMultiQ;
  value: string[] | undefined;
  onToggle: (v: string) => void;
}) {
  const picked = value ?? [];
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

function TextRow({
  p,
  value,
  onChange,
}: {
  p: ProbeTextQ;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="probe-row">
      <div className="probe-q">{p.q}</div>
      <textarea
        className="probe-text"
        rows={2}
        placeholder={p.placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function StageProbe({
  concept,
  probes,
  setProbes,
  estimatedLevel,
  setEstimatedLevel,
  onPrev,
  onNext,
}: Props) {
  const allAnswered = typeof probes.p1 === "number" && Array.isArray(probes.p2);
  const submitted = estimatedLevel != null;

  const submit = () => {
    setEstimatedLevel(estimateLevel(probes));
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
            if (p.kind === "choice") {
              return (
                <ChoiceRow
                  key={p.id}
                  p={p}
                  value={probes.p1}
                  onChange={(nv) => setProbes((prev) => ({ ...prev, p1: nv }))}
                />
              );
            }
            if (p.kind === "multi") {
              return (
                <MultiRow
                  key={p.id}
                  p={p}
                  value={probes.p2}
                  onToggle={(val) =>
                    setProbes((prev) => {
                      const picked = prev.p2 ?? [];
                      const next = picked.includes(val)
                        ? picked.filter((x) => x !== val)
                        : [...picked, val];
                      return { ...prev, p2: next };
                    })
                  }
                />
              );
            }
            return (
              <TextRow
                key={p.id}
                p={p}
                value={probes.p3}
                onChange={(nv) => setProbes((prev) => ({ ...prev, p3: nv }))}
              />
            );
          })}
        </div>

        {submitted && estimatedLevel != null && (
          <div className="probe-result">
            <div className="pr-head">
              <span className="pr-eyebrow">수준 추정 결과</span>
              <span className="pr-level">
                L{estimatedLevel} · {LEVEL_LABELS[estimatedLevel]}
              </span>
            </div>
            <p className="pr-reason">{levelReason(probes, estimatedLevel)}</p>
            <p className="pr-note">
              이 추정에 맞춰 <strong>{STEPS.length}단계</strong> 코스를 짜드릴게요. 다음 화면에서 확인할 수 있어요.
            </p>
          </div>
        )}
      </div>

      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={onPrev}>
          ← 개념 다시 입력
        </button>
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
