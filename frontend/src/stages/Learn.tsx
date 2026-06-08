import { useEffect, useRef, useState } from "react";
import { useLearnContent } from "../state/LearnContent";
import { Markdown } from "../lib/markdown";
import { LEVEL_LABELS, type Step } from "./data";
import { pickRandomPlaceholder } from "./placeholders";
import { describeErrorCode } from "../lib/errors";
import { I } from "../components/icons";
import type { Grade } from "../api/claudeContent";
import { BranchDialog } from "../components/branch/BranchDialog";
import { useBranchPhase } from "../state/useBranchPhase";
import type { BranchOption } from "../api/contract";

interface InsertedMeta {
  parentDisplayBase: string; // e.g. "1" or "1-1"
  siblingIndex: number;       // 0-based among same-parent siblings
}

function stripLeadingZero(label: string): string {
  return label.replace(/^0+(?=\d)/, "");
}

/**
 * 확인 질문 답변 입력칸. 마운트 시 1회만 랜덤 placeholder 를 골라 고정한다.
 * 질문마다 독립 컴포넌트로 마운트되므로 입력칸마다 서로 다른 문구가 표시된다.
 */
function QaAnswer({
  value,
  readOnly,
  onChange,
  onBlur,
}: {
  value: string;
  readOnly: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const [placeholder] = useState(pickRandomPlaceholder);
  return (
    <textarea
      className="qa-answer"
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

interface Props {
  concept: string;
  level: number | null;
  stepIdx: number;
  setStepIdx: (n: number) => void;
  answers: Record<string, string>;
  setAnswers: (next: Record<string, string>) => void;
  /** 입력 완료 신호. textarea 포커스 이탈 시 보류 중인 답변을 즉시 저장한다. */
  onAnswerCommit?: () => void;
  skips: Record<string, boolean>;
  setSkips: (next: Record<string, boolean>) => void;
  onPrev: () => void;
  onDone: () => void;
  onRetry: () => void;
}

const GRADE_LABEL: Record<Grade, string> = {
  correct: "정답",
  almost: "거의 맞음",
  partial: "부족",
  wrong: "오답",
};

type Orient = "vertical" | "horizontal";

const IcoRows = () => (
  <svg className="ico" viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="1.5" y="2" width="13" height="4" rx="1.2" fill="currentColor" />
    <rect x="1.5" y="8.5" width="13" height="5.5" rx="1.2" fill="currentColor" opacity="0.45" />
  </svg>
);
const IcoCols = () => (
  <svg className="ico" viewBox="0 0 16 16" fill="none" aria-hidden>
    <rect x="1.5" y="2" width="5.5" height="12" rx="1.2" fill="currentColor" />
    <rect x="9" y="2" width="5.5" height="12" rx="1.2" fill="currentColor" opacity="0.45" />
  </svg>
);

export function StageLearn({
  concept,
  level,
  stepIdx,
  setStepIdx,
  answers,
  setAnswers,
  onAnswerCommit,
  skips,
  setSkips,
  onPrev,
  onDone,
  onRetry,
}: Props) {
  const {
    steps,
    outlineStatus,
    outlineError,
    stepDetailStatus,
    stepDetailErrors,
    loadStepDetail,
    stepEvaluations,
    stepEvalStatus,
    stepEvalErrors,
    submitEvaluation,
    insertStepAt,
  } = useLearnContent();
  const branch = useBranchPhase();
  const [insertedMeta, setInsertedMeta] = useState<Map<number, InsertedMeta>>(new Map());
  const [branchVisible, setBranchVisible] = useState(false);
  // 레이아웃 방향: 기본 세로(접이식 설명 ▸ 질문). 저장값 의존 없이 항상 세로로 시작.
  const [orient, setOrient] = useState<Orient>("vertical");
  // 세로 모드에서 개념 설명 카드 접힘 여부 (기본 펼침).
  const [explainOpen, setExplainOpen] = useState(true);

  // 각 step 의 표시 라벨 계산: 원본은 "01","02"…, 삽입은 "1-1","1-2"…
  const displayLabelOf = (s: Step): string => {
    const meta = insertedMeta.get(s.id);
    if (meta) return `${meta.parentDisplayBase}-${meta.siblingIndex + 1}`;
    // 원본 카운트
    let count = 0;
    for (const x of steps) {
      if (!insertedMeta.has(x.id)) {
        count += 1;
        if (x.id === s.id) return String(count).padStart(2, "0");
      }
    }
    return String(count).padStart(2, "0");
  };
  const safeLevel = level ?? 2;
  const step = steps[stepIdx];
  const detailStatus = stepDetailStatus[stepIdx] ?? "idle";
  const detailError = stepDetailErrors[stepIdx] ?? null;
  const evalStatus = stepEvalStatus[stepIdx] ?? "idle";
  const evalError = stepEvalErrors[stepIdx] ?? null;
  const evalResult = stepEvaluations[stepIdx];
  const isEvaluated = evalStatus === "ready" && !!evalResult;
  const isEvaluating = evalStatus === "loading";

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    if (
      outlineStatus === "ready" &&
      step &&
      (detailStatus === "idle" || (detailStatus === "ready" && !step.body))
    ) {
      void loadStepDetail(concept, safeLevel, stepIdx);
    }
  }, [outlineStatus, stepIdx, step, detailStatus, concept, safeLevel, loadStepDetail]);

  // stepIdx 가 바뀌면 분기 가시 상태도 닫는다.
  useEffect(() => {
    setBranchVisible(false);
    branch.closeBranch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  const handleChoose = (option: BranchOption) => {
    const nextState = branch.chooseBranch(option, {
      roadmapStages: steps,
      currentStageIndex: stepIdx,
      stage: "explain",
    });
    if (option.type === "exit" || nextState.stage === "done") {
      onDone();
      return;
    }
    if (option.type === "roadmap_next") {
      if (stepIdx >= steps.length - 1) onDone();
      else setStepIdx(stepIdx + 1);
      return;
    }
    if (option.stageContent) {
      const parentStep = steps[stepIdx];
      const parentLabel = parentStep ? displayLabelOf(parentStep) : "0";
      const parentBase = stripLeadingZero(parentLabel);
      let siblings = 0;
      for (const m of insertedMeta.values()) {
        if (m.parentDisplayBase === parentBase) siblings += 1;
      }
      const assignedId = insertStepAt(stepIdx + 1, option.stageContent);
      setInsertedMeta((prev) => {
        const next = new Map(prev);
        next.set(assignedId, { parentDisplayBase: parentBase, siblingIndex: siblings });
        return next;
      });
      setBranchVisible(false);
      setStepIdx(stepIdx + 1);
    }
  };

  const handleRetry = () => {
    if (!step) return;
    const roadmapOutlineText = steps
      .map((s, i) => `${i + 1}. ${s.title} - ${s.desc}`)
      .join("\n");
    const qList = step.questions
      .filter((q) => !skips[q.id])
      .map((q) => ({ id: q.id, q: q.q, answer: answers[q.id] || "" }));
    void branch.retryBranch({
      concept,
      level: safeLevel,
      step,
      questions: qList,
      roadmapOutlineText,
    });
  };

  if (outlineStatus === "loading" || outlineStatus === "idle") {
    return (
      <div className="lv-board">
        <div className="lv-loading">
          <span className="lv-loading-dot" />
          <p className="stage-sub">학습 로드맵을 구성하고 있어요…</p>
        </div>
      </div>
    );
  }

  if (outlineStatus === "error") {
    return (
      <div className="lv-board">
        <div className="probe-result lv-status" role="alert">
          <div className="pr-head">
            <span className="pr-eyebrow">로드맵 생성 실패</span>
          </div>
          <p className="pr-reason">
            {outlineError ? describeErrorCode(outlineError.code, outlineError.message) : "알 수 없는 오류"}
          </p>
          <button className="btn-ghost" type="button" onClick={onRetry}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const goPrev = () => {
    if (stepIdx === 0) onPrev();
    else setStepIdx(stepIdx - 1);
  };
  const goNext = () => {
    if (!isEvaluated) {
      showToast("답변 제출이 필요합니다");
      return;
    }
    if (stepIdx >= steps.length - 1) onDone();
    else setStepIdx(stepIdx + 1);
  };
  const skipStep = () => {
    if (isEvaluated) return;
    const nextSkips = { ...skips };
    for (const q of step?.questions ?? []) nextSkips[q.id] = true;
    setSkips(nextSkips);
  };
  const submitAnswers = () => {
    if (!step || isEvaluating || isEvaluated) return;
    void submitEvaluation(concept, safeLevel, stepIdx, answers, skips);
    // 동시에 분기 평가도 백그라운드로 시작. 사용자는 "평가 보기" 버튼으로 다이얼로그를 연다.
    const roadmapOutlineText = steps
      .map((s, i) => `${i + 1}. ${s.title} - ${s.desc}`)
      .join("\n");
    const qList = step.questions
      .filter((q) => !skips[q.id])
      .map((q) => ({ id: q.id, q: q.q, answer: answers[q.id] || "" }));
    void branch.openBranch({
      concept,
      level: safeLevel,
      step,
      questions: qList,
      roadmapOutlineText,
    });
  };

  // 두 호출의 합산 로딩/완료 상태
  const branchLoading = branch.mode === "loading";
  const branchReady = branch.mode === "choosing" || branch.mode === "error";
  const fullLoading = isEvaluating || branchLoading;
  const fullReady = isEvaluated && branchReady;

  const detailLoading = detailStatus === "loading" || detailStatus === "idle";
  const detailErrored = detailStatus === "error";
  // body 는 streaming 중에도 렌더되지만, questions/제출 영역은 complete(ready) 후에만 노출.
  const detailReady = detailStatus === "ready";

  const gradeFor = (qid: string) =>
    evalResult?.evaluations.find((e) => e.id === qid);

  // 가로/세로 두 방향이 공유하는 조각들 (래퍼만 방향별로 달라진다).
  const submitButton = fullReady ? (
    <button
      className="lv-btn-holo lv-submit"
      type="button"
      onClick={() => setBranchVisible(true)}
    >
      <span className="lv-submit-icon" aria-hidden>{I.brand}</span>
      평가 보기
    </button>
  ) : (
    <button
      className={"lv-btn-holo lv-submit" + (fullLoading ? " is-loading" : "")}
      type="button"
      onClick={submitAnswers}
      disabled={fullLoading || isEvaluated}
      aria-busy={fullLoading || undefined}
    >
      <span className="lv-submit-icon" aria-hidden>{I.brand}</span>
      {fullLoading ? "평가 중…" : "답변 제출하기"}
    </button>
  );

  const explainDetail = step ? (
    <>
      {detailLoading && (
        <div className="lv-loading lv-loading-inline">
          <span className="lv-loading-dot" />
          <p className="stage-sub">개념 설명을 생성하고 있어요…</p>
        </div>
      )}
      {detailErrored && detailError && (
        <div className="probe-result" role="alert">
          <p className="pr-reason">{describeErrorCode(detailError.code, detailError.message)}</p>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => loadStepDetail(concept, safeLevel, stepIdx)}
          >
            다시 시도
          </button>
        </div>
      )}
      {!detailLoading && !detailErrored && step.body && <Markdown text={step.body} />}
    </>
  ) : null;

  const questionsList = step ? (
    <>
      {evalStatus === "error" && evalError && (
        <div className="probe-result" role="alert">
          <p className="pr-reason">{describeErrorCode(evalError.code, evalError.message)}</p>
          <button
            className="btn-ghost"
            type="button"
            onClick={() => submitEvaluation(concept, safeLevel, stepIdx, answers, skips)}
          >
            다시 시도
          </button>
        </div>
      )}
      {!detailReady && !detailErrored && (
        <div className="lv-loading lv-loading-inline">
          <span className="lv-loading-dot" />
          <p className="stage-sub">확인 질문을 만들고 있어요…</p>
        </div>
      )}
      {detailReady &&
        step.questions.map((q, i) => {
          const val = answers[q.id] || "";
          const isSkipped = !!skips[q.id];
          const ev = gradeFor(q.id);
          const locked = isEvaluated;
          return (
            <div
              key={q.id}
              className={
                "qa-pair" +
                (isSkipped ? " is-skipped" : "") +
                (ev ? ` is-graded grade-${ev.grade}` : "")
              }
            >
              <div className="qa-head">
                <span className="qa-num">Q{i + 1}</span>
                <span className="qa-question">{q.q}</span>
                {ev && !isSkipped && (
                  <span className={`grade-badge grade-${ev.grade}`}>{GRADE_LABEL[ev.grade]}</span>
                )}
              </div>
              <QaAnswer
                value={val}
                readOnly={locked}
                onChange={(v) => {
                  if (locked) return;
                  setAnswers({ ...answers, [q.id]: v });
                  if (isSkipped) setSkips({ ...skips, [q.id]: false });
                }}
                onBlur={() => onAnswerCommit?.()}
              />
              {ev && !isSkipped && (
                <div className="qa-feedback">
                  <span className="qa-feedback-label">AI 피드백</span>
                  <p>{ev.feedback}</p>
                </div>
              )}
              {!locked && (
                <div className="qa-foot">
                  <button
                    type="button"
                    className="qa-dunno"
                    onClick={() => {
                      setAnswers({ ...answers, [q.id]: "모르겠어요" });
                      if (isSkipped) setSkips({ ...skips, [q.id]: false });
                    }}
                  >
                    모르겠어요
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </>
  ) : null;

  return (
    <div className="lv-board">
      <header className="lv-bar">
        <div className="lv-bar-top">
          <span className="lv-bar-eyebrow">학습 진행</span>
          <span className="lv-bar-title">{concept}</span>
          <span className="lv-bar-spacer" />
          <span className="lv-bar-meta">
            개념 {Math.min(stepIdx + 1, Math.max(steps.length, 1))}/{steps.length} · {LEVEL_LABELS[safeLevel]}
          </span>
          <div className="lv-seg" role="group" aria-label="레이아웃 방향">
            <button
              type="button"
              className={orient === "vertical" ? "is-active" : ""}
              aria-pressed={orient === "vertical"}
              onClick={() => setOrient("vertical")}
            >
              <IcoRows /> 세로
            </button>
            <button
              type="button"
              className={orient === "horizontal" ? "is-active" : ""}
              aria-pressed={orient === "horizontal"}
              onClick={() => setOrient("horizontal")}
            >
              <IcoCols /> 가로
            </button>
          </div>
        </div>
        <ol className="lv-steps">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={
                "lv-step" +
                (i === stepIdx ? " is-curr" : "") +
                (i < stepIdx ? " is-done" : "") +
                (insertedMeta.has(s.id) ? " is-inserted" : "")
              }
            >
              <button type="button" onClick={() => setStepIdx(i)}>
                <span className="lv-step-num">{displayLabelOf(s)}</span>
                <span className="lv-step-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </header>

      {step &&
        (orient === "horizontal" ? (
          /* ── 가로형: 좌(설명) · 우(질문) 2단 ── */
          <div className="lv-body lv2-body">
            <div className="lv2-left">
              <div className="lv2-left-inner">
                <span className="lv2-eyebrow">개념 설명</span>
                <h3>{step.title}</h3>
                <p className="lv2-sub">{step.desc}</p>
                {explainDetail}
              </div>
            </div>
            <div className="lv2-right">
              <div className="lv2-right-head">
                <span className="label">확인 질문</span>
                <span className="count">{detailReady ? `${step.questions.length}문항` : "..."}</span>
              </div>
              {questionsList}
              {detailReady && (
                <div className="lv2-right-sticky-bottom">{submitButton}</div>
              )}
            </div>
          </div>
        ) : (
          /* ── 세로형: 접이식 설명 ▸ 질문 (기본) ── */
          <div className="lv-body lvv-body">
            <section className={"lvv-explain" + (explainOpen ? "" : " is-closed")}>
              <button
                className="lvv-explain-head"
                type="button"
                onClick={() => setExplainOpen((v) => !v)}
              >
                <span className="eyebrow">개념 설명</span>
                <span className="ttl">{step.title}</span>
                <span className="grow" />
                <span className="toggle">{explainOpen ? "접기" : "펼쳐 보기"}</span>
                <span className="chev">▾</span>
              </button>
              <div className="lvv-explain-summary">{step.desc}</div>
              <div className="lvv-explain-body">
                <p className="lvv-sub">{step.desc}</p>
                {explainDetail}
              </div>
            </section>

            <section className="lvv-questions">
              <div className="lvv-q-head">
                <span className="label">확인 질문</span>
                <span className="grow" />
                <span className="count">{detailReady ? `${step.questions.length}문항` : "..."}</span>
              </div>
              <div className="lvv-qlist">{questionsList}</div>
              {detailReady && (
                <div className="lvv-submit-row">{submitButton}</div>
              )}
            </section>
          </div>
        ))}

      <div className="lv-foot">
        <button className="lv-btn-ghost" type="button" onClick={goPrev}>
          ← {stepIdx === 0 ? "수준 확인 다시 보기" : "이전 개념"}
        </button>
        <span className="grow" />
        <button
          className="lv-btn-ghost"
          type="button"
          onClick={skipStep}
          disabled={detailLoading || isEvaluated || isEvaluating}
        >
          모르겠어요 (전체 건너뜀)
        </button>
        <button
          className="lv-btn-holo"
          type="button"
          onClick={goNext}
          disabled={detailLoading || isEvaluating}
        >
          {stepIdx >= steps.length - 1 ? "학습 마치기" : "다음 개념"} →
        </button>
      </div>

      {toast && <div className="lv-toast" role="status">{toast}</div>}

      <BranchDialog
        open={branchVisible && (branch.mode === "choosing" || branch.mode === "error")}
        evaluationText={branch.evaluationText}
        options={branch.options}
        onChoose={handleChoose}
        onClose={() => setBranchVisible(false)}
        error={
          branch.mode === "error"
            ? {
                message: branch.errorMessage ?? "분기 옵션을 불러오지 못했습니다.",
                retryCount: branch.retryCount,
                technicalDetail: branch.technicalDetail ?? undefined,
                onRetry: handleRetry,
                onExit: onDone,
              }
            : null
        }
      />
    </div>
  );
}
