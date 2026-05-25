import { useState } from "react";
import {
  estimateLevel,
  type ProbeAnswers,
  type ProbeChoiceQ,
  type ProbeMultiQ,
  type ProbeTextQ,
} from "./data";
import { useLearnContent } from "../state/LearnContent";
import { describeErrorCode } from "../lib/errors";

interface Props {
  concept: string;
  probes: ProbeAnswers;
  setProbes: (updater: (prev: ProbeAnswers) => ProbeAnswers) => void;
  setEstimatedLevel: (v: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onRetry: () => void;
}

function ChoiceRow({
  p,
  value,
  onChange,
  highlightRequired,
}: {
  p: ProbeChoiceQ;
  value: number | undefined;
  onChange: (v: number) => void;
  highlightRequired?: boolean;
}) {
  return (
    <div className={"probe-row" + (highlightRequired ? " is-required-missing" : "")}>
      <div className="probe-q">
        {p.q} <span className="probe-badge probe-badge--required">필수</span>
      </div>
      {p.sub && <div className="probe-sub">{p.sub}</div>}
      {highlightRequired && (
        <div className="probe-error">선택지를 하나 골라주세요.</div>
      )}
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
      <div className="probe-q">
        {p.q} <span className="probe-badge">선택</span>
      </div>
      <div className="probe-sub">{p.sub ?? "건너뛰셔도 괜찮아요."}</div>
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
      <div className="probe-q">
        {p.q} <span className="probe-badge">선택</span>
      </div>
      <div className="probe-sub">건너뛰셔도 괜찮아요.</div>
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
  setEstimatedLevel,
  onPrev,
  onNext,
  onRetry,
}: Props) {
  const {
    probeQuestions,
    probeStatus,
    probeError,
    probeFromFallback,
  } = useLearnContent();

  const requiredFilled = typeof probes.p1 === "number";
  const loading = probeStatus === "loading";
  const [showRequiredError, setShowRequiredError] = useState(false);

  const submit = () => {
    if (!requiredFilled) {
      setShowRequiredError(true);
      return;
    }
    setShowRequiredError(false);
    setEstimatedLevel(estimateLevel(probes, probeQuestions));
    onNext();
  };

  return (
    <section className="stage">
      <header className="stage-head">
        <div className="stage-eyebrow">01 · 수준 확인</div>
        <h2 className="stage-title">{concept}, 몇 가지만 짧게 여쭐게요</h2>
        <p className="stage-sub">답을 보고 수준을 추정해서 단계와 깊이를 맞춰드릴게요</p>
      </header>

      <div className="stage-body">
        {loading && (
          <p className="stage-sub">개념에 맞는 진단 문항을 만들고 있습니다…</p>
        )}

        {probeStatus === "error" && probeError && (
          <div className="probe-result" role="alert">
            <div className="pr-head">
              <span className="pr-eyebrow">진단 문항 생성 실패</span>
            </div>
            <p className="pr-reason">{describeErrorCode(probeError.code, probeError.message)}</p>
            {probeFromFallback && (
              <p className="pr-note">샘플 문항을 임시로 보여드렸어요.</p>
            )}
            <button className="btn-ghost" type="button" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && probeQuestions.length > 0 && (
          <div className="probe-list">
            {probeQuestions.map((p) => {
              if (p.kind === "choice") {
                return (
                  <ChoiceRow
                    key={p.id}
                    p={p}
                    value={probes.p1}
                    onChange={(nv) => {
                      setProbes((prev) => ({ ...prev, p1: nv }));
                      setShowRequiredError(false);
                    }}
                    highlightRequired={showRequiredError && !requiredFilled}
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
        )}
      </div>

      <div className="stage-actions">
        <button className="btn-ghost" type="button" onClick={onPrev}>
          ← 개념 다시 입력
        </button>
        <span className="grow" />
        <button className="btn-holo" type="button" onClick={submit} disabled={loading}>
          단계 만들기 →
        </button>
      </div>
    </section>
  );
}
