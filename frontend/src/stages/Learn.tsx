import { useEffect, useRef, useState } from "react";
import { useLearnContent } from "../state/LearnContent";
import { Markdown } from "../lib/markdown";
import { LEVEL_LABELS } from "./data";
import { describeErrorCode } from "../lib/errors";
import { I } from "../components/icons";
import type { Grade } from "../api/claudeContent";
import { BranchDialog } from "../components/branch/BranchDialog";
import { StepChipsBar } from "../components/branch/StepChipsBar";
import { useBranchPhase } from "../state/useBranchPhase";
import type { BranchOption } from "../api/contract";

interface Props {
  concept: string;
  level: number | null;
  stepIdx: number;
  setStepIdx: (n: number) => void;
  answers: Record<string, string>;
  setAnswers: (next: Record<string, string>) => void;
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

export function StageLearn({
  concept,
  level,
  stepIdx,
  setStepIdx,
  answers,
  setAnswers,
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
  const [insertedIds, setInsertedIds] = useState<Set<number>>(new Set());
  const branchTriggeredFor = useRef<number | null>(null);
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

  // 평가 완료 시 (한 번만) 분기 다이얼로그를 띄운다.
  useEffect(() => {
    if (!isEvaluated || !step) return;
    if (branchTriggeredFor.current === stepIdx) return;
    if (branch.mode !== "closed") return;
    branchTriggeredFor.current = stepIdx;
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
  }, [isEvaluated, step, stepIdx, steps, answers, skips, concept, safeLevel, branch]);

  // stepIdx 가 바뀌면 다음 단계에서 다시 트리거될 수 있도록 ref 를 비운다.
  useEffect(() => {
    if (branchTriggeredFor.current !== null && branchTriggeredFor.current !== stepIdx) {
      branchTriggeredFor.current = null;
    }
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
      const assignedId = insertStepAt(stepIdx + 1, option.stageContent);
      setInsertedIds((prev) => {
        const next = new Set(prev);
        next.add(assignedId);
        return next;
      });
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
  };

  const detailLoading = detailStatus === "loading" || detailStatus === "idle";
  const detailErrored = detailStatus === "error";

  const gradeFor = (qid: string) =>
    evalResult?.evaluations.find((e) => e.id === qid);

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
        </div>
        <ol className="lv-steps">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={
                "lv-step" +
                (i === stepIdx ? " is-curr" : "") +
                (i < stepIdx ? " is-done" : "") +
                (insertedIds.has(s.id) ? " is-inserted" : "")
              }
            >
              <button type="button" onClick={() => setStepIdx(i)}>
                <span className="lv-step-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="lv-step-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <StepChipsBar steps={steps} currentIndex={stepIdx} insertedIds={insertedIds} />
      </header>

      {step && (
        <div className="lv-body lv2-body">
          <div className="lv2-left">
            <div className="lv2-left-inner">
              <span className="lv2-eyebrow">개념 설명</span>
              <h3>{step.title}</h3>
              <p className="lv2-sub">{step.desc}</p>
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
            </div>
          </div>
          <div className="lv2-right">
            <div className="lv2-right-head">
              <span className="label">확인 질문</span>
              <span className="count">{detailLoading ? "..." : `${step.questions.length}문항`}</span>
            </div>
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
            {detailLoading && (
              <div className="lv-loading lv-loading-inline">
                <span className="lv-loading-dot" />
                <p className="stage-sub">확인 질문을 만들고 있어요…</p>
              </div>
            )}
            {!detailLoading &&
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
                    <textarea
                      className="qa-answer"
                      placeholder="자유롭게 적어주세요. 짧아도 좋아요."
                      value={val}
                      readOnly={locked}
                      onChange={(e) => {
                        if (locked) return;
                        setAnswers({ ...answers, [q.id]: e.target.value });
                        if (isSkipped) setSkips({ ...skips, [q.id]: false });
                      }}
                    />
                    {ev && !isSkipped && (
                      <div className="qa-feedback">
                        <span className="qa-feedback-label">AI 피드백</span>
                        <p>{ev.feedback}</p>
                      </div>
                    )}
                    <div className="qa-foot">
                      <span className="qa-count">
                        {val.length}자{isSkipped ? " · 건너뜀" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            {!detailLoading && (
              <div className="lv2-right-sticky-bottom">
                <button
                  className="lv-btn-holo lv-submit"
                  type="button"
                  onClick={submitAnswers}
                  disabled={isEvaluating || isEvaluated}
                >
                  <span className="lv-submit-icon" aria-hidden>{I.brand}</span>
                  {isEvaluating ? "평가 중…" : isEvaluated ? "평가 완료" : "답변 제출하기"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
        open={branch.mode === "choosing" || branch.mode === "error" || branch.mode === "loading"}
        evaluationText={branch.evaluationText}
        options={branch.options}
        onChoose={handleChoose}
        onClose={branch.closeBranch}
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
