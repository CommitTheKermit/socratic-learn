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
import { MathText } from "../lib/mathText";
import type { BranchOption } from "../api/contract";
import { logEvent } from "../lib/analytics";
import { getLabelForStep } from "../lib/stepLabel";
import { canInsertBranchStep } from "../lib/stepInsertGuard";
import { loadOrient, saveOrient, type Orient } from "../state/orientSetting";

/**
 * LLM 이 돌려준 분기 옵션을 결정론적으로 보정한다.
 * "로드맵 다음 단계로 이동"(roadmap_next) 은 프론트가 가진 steps/stepIdx 가 진실 출처다.
 * LLM 은 현재 stepIdx 를 모르고 다음 단계 내용도 지어내므로(존재 여부·내용 모두 hallucination),
 * LLM 생성분은 버리고 여기서 실제 로드맵 기준으로 직접 만든다.
 *  - 다음 단계가 있으면 실제 steps[stepIdx+1] 을 가리키는 옵션을 항상 첫 번째로 둔다.
 *  - 마지막 단계면 옵션 자체를 빼고 LLM 이 만든 나머지(추천/추가/마무리)만 남긴다.
 */
function normalizeBranchOptions(
  options: BranchOption[],
  steps: Step[],
  stepIdx: number,
): BranchOption[] {
  const rest = options.filter((o) => o.type !== "roadmap_next");
  const nextStep = steps[stepIdx + 1];
  if (!nextStep) return rest;
  const roadmapNext: BranchOption = {
    label: "로드맵 다음 단계로 이동",
    type: "roadmap_next",
    isRecommended: false,
    stageContent: nextStep,
  };
  return [roadmapNext, ...rest];
}

/** 분기 다이얼로그에 항상 끼워 넣는 클라이언트 전용 옵션. 현재 단계를 다시 답변하기. */
const REANSWER_OPTION: BranchOption = {
  label: "다시 답변하기",
  type: "reanswer",
  isRecommended: false,
  stageContent: null,
};

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
  if (readOnly) {
    // 평가 완료 후 학생 입력 에코: 수식 렌더링을 위해 div 로 표시한다.
    return (
      <div className="qa-answer qa-answer--echo">
        <MathText text={value || ""} />
      </div>
    );
  }
  return (
    <textarea
      className="qa-answer"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
    />
  );
}

interface Props {
  concept: string;
  level: number | null;
  /** 답변 모드. "light" 면 분기 시스템을 끄고(평가만) 바로 다음으로 진행한다. */
  mode: string;
  sessionId?: string;
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
  mode,
  sessionId,
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
    clearEvaluation,
    stepBranches,
    setStepBranch,
    branchedStepIds,
    markBranched,
    insertStepAt,
  } = useLearnContent();
  const branch = useBranchPhase();
  const [branchVisible, setBranchVisible] = useState(false);
  // 분기 옵션 선택 완료 step.id 집합(branchedStepIds)과 분기 스냅샷(stepBranches)은
  // LearnContent 가 보유·영속화한다. markBranched 로만 추가되며 새로고침/세션 복원 시 유지된다.
  // 레이아웃 방향: 기본 세로(접이식 설명 ▸ 질문). 저장값(localStorage)이 있으면 복원한다.
  const [orient, setOrientState] = useState<Orient>(loadOrient);
  const setOrient = (o: Orient) => {
    setOrientState(o);
    saveOrient(o);
  };
  // 세로 모드에서 개념 설명 카드 접힘 여부 (기본 펼침).
  const [explainOpen, setExplainOpen] = useState(true);
  const safeLevel = level ?? 2;
  // "가볍게" 모드는 분기 시스템을 끄고 평가만 한 뒤 바로 다음 개념으로 진행한다.
  const branchEnabled = mode !== "light";
  const step = steps[stepIdx];
  const detailStatus = stepDetailStatus[stepIdx] ?? "idle";
  const detailError = stepDetailErrors[stepIdx] ?? null;
  const evalStatus = stepEvalStatus[stepIdx] ?? "idle";
  const evalError = stepEvalErrors[stepIdx] ?? null;
  const evalResult = stepEvaluations[stepIdx];
  const isEvaluated = evalStatus === "ready" && !!evalResult;
  const isEvaluating = evalStatus === "loading";
  // 분기 게이트: 분기 모드에서 평가가 끝났지만 아직 분기 선택을 하지 않은 비마지막 단계.
  // 이 조건이 true 이면 goNext/칩 전진은 차단되고 토스트만 표시된다.
  const isBranchGated =
    branchEnabled &&
    isEvaluated &&
    stepIdx < steps.length - 1 &&
    !!step &&
    !branchedStepIds.has(step.id);

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

  // ── 학습 로드맵 미니 바 (스크롤 시 헤더가 사라지면 위에서 슬라이드+페이드 등장) ──
  // 트리거: 실제 헤더(lv-bar)가 스크롤 컨테이너(.main-inner) 위로 완전히 벗어나면 표시.
  const [miniVisible, setMiniVisible] = useState(false);
  const headRef = useRef<HTMLElement | null>(null);
  const miniRef = useRef<HTMLDivElement | null>(null);
  const miniRailRef = useRef<HTMLOListElement | null>(null);

  // 헤더(lv-bar)가 스크롤 컨테이너(.main-inner) 위로 벗어나면 미니 바를 띄우고,
  // 미니 바(position:fixed)를 스크롤러 상단(상단 크롬 아래)에 맞춘다.
  // 콜백 ref 가 아니라 useEffect+ref 로 거는 이유: 세션 복원/새로고침으로 마운트되는
  // 경로에서 콜백 ref 는 옵저버가 신뢰성 있게 걸리지 않아 미니 바가 안 떴다. 커밋 직후
  // outlineStatus(ready)·orient 변화에 맞춰 한 번 확실히 옵저버를 건다(디자인 소스 방식).
  useEffect(() => {
    const head = headRef.current;
    const scroller = head?.closest<HTMLElement>(".main-inner");
    if (!head || !scroller) return;
    const place = () => {
      const mini = miniRef.current;
      if (!mini) return;
      // top:0(뷰포트 최상단)이 아니라 스크롤러 상단에 맞춰 모바일 상단바(.m-topbar) 겹침 방지.
      mini.style.top = `${scroller.getBoundingClientRect().top}px`;
    };
    place();
    window.addEventListener("resize", place);
    if (typeof IntersectionObserver === "undefined") {
      return () => window.removeEventListener("resize", place);
    }
    const io = new IntersectionObserver(
      ([entry]) => setMiniVisible(!entry.isIntersecting),
      { root: scroller, threshold: 0 },
    );
    io.observe(head);
    return () => {
      io.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [outlineStatus, orient]);

  // 미니 바가 보일 때 현재 칩을 가로 레일 중앙으로 정렬한다.
  useEffect(() => {
    if (!miniVisible) return;
    const rail = miniRailRef.current;
    if (!rail || typeof rail.scrollTo !== "function") return;
    const cur = rail.querySelector<HTMLElement>(".is-curr");
    if (!cur) return;
    rail.scrollTo({
      left: cur.offsetLeft - rail.clientWidth / 2 + cur.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [miniVisible, stepIdx]);

  useEffect(() => {
    if (
      outlineStatus === "ready" &&
      step &&
      (detailStatus === "idle" || (detailStatus === "ready" && !step.body))
    ) {
      void loadStepDetail(concept, safeLevel, stepIdx, mode);
    }
  }, [outlineStatus, stepIdx, step, detailStatus, concept, safeLevel, mode, loadStepDetail]);

  // stepIdx 가 바뀌면 분기 다이얼로그를 닫는다. 단, 그 단계에 영속된 분기 스냅샷이 있으면
  // closeBranch(휘발) 대신 hydrate 로 choosing 상태를 복원해 "평가 보기"가 다시 동작하게 한다.
  // (영속값에서 즉시 복원하므로 LLM 재호출 비용이 없다.)
  useEffect(() => {
    setBranchVisible(false);
    const persisted = stepBranches[stepIdx];
    if (branchEnabled && persisted) branch.hydrate(persisted);
    else branch.closeBranch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  // 분기 평가가 성공(choosing)하면 그 스냅샷을 stepBranches 에 영속화한다.
  // 새로고침/단계 이동으로 다이얼로그가 휘발돼도 위 hydrate 가 이 값으로 복원한다.
  // hydrate 직후처럼 동일 스냅샷이 이미 저장돼 있으면(참조 동일) 중복 저장을 건너뛴다.
  useEffect(() => {
    if (!branchEnabled || branch.mode !== "choosing") return;
    const cur = stepBranches[stepIdx];
    if (cur && cur.options === branch.options && cur.evaluationText === branch.evaluationText) {
      return;
    }
    setStepBranch(stepIdx, {
      evaluationText: branch.evaluationText,
      isMerged: branch.isMerged,
      options: branch.options,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchEnabled, branch.mode, branch.options, branch.evaluationText, branch.isMerged, stepIdx]);

  // sl_step_enter: 스텝 진입/이동 시 계측(fire-and-forget).
  // stepIdx 변경마다 1회 emit. sessionId 없으면 no-op.
  useEffect(() => {
    if (!sessionId) return;
    logEvent("sl_step_enter", { session_id: sessionId, step_idx: stepIdx });
  }, [sessionId, stepIdx]);

  // 재답변: 현재 단계의 평가를 비워 잠금을 풀고, 열린 분기 다이얼로그/평가를 닫는다.
  // 이미 분기를 고른 단계여도(branchedStepIds 유지) 호출 가능 - "마치기 전이면 언제든".
  // 평가가 비워지면 isEvaluated 가 false 가 되어 입력칸 편집과 "답변 제출하기"가 복귀하고,
  // 재제출 시 submitAnswers 가 평가+분기를 새로 시작한다.
  const handleReanswer = () => {
    if (!step) return;
    if (sessionId) {
      logEvent("sl_reanswer", { session_id: sessionId, step_idx: stepIdx });
    }
    clearEvaluation(stepIdx);
    setBranchVisible(false);
    branch.closeBranch();
  };

  const handleChoose = (option: BranchOption) => {
    // reanswer 는 분기 이동이 아니라 현재 단계 재답변. 계측/리듀서 전에 가로챈다.
    if (option.type === "reanswer") {
      handleReanswer();
      return;
    }
    // sl_branch_select 계측: 분기 옵션 선택 즉시 emit (fire-and-forget).
    if (sessionId) {
      logEvent("sl_branch_select", {
        session_id: sessionId,
        step_idx: stepIdx,
        choice: option.label,
      });
    }
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
      if (step) markBranched(step.id);
      if (stepIdx >= steps.length - 1) onDone();
      else setStepIdx(stepIdx + 1);
      return;
    }
    if (option.stageContent) {
      if (step) markBranched(step.id);

      // AC2 + AC3: canInsertBranchStep 이 두 레이어를 통합 판정한다.
      //  - AC2: ai_recommended + isMerged=true → 삽입 차단
      //  - AC3: 제목 중복 백스톱 → 삽입 차단
      // 두 경우 모두 branchedStepIds 에는 추가됐으므로 분기 게이트는 해제된 상태.
      if (!canInsertBranchStep(option.type, branch.isMerged, option.stageContent, steps)) {
        setBranchVisible(false);
        if (stepIdx >= steps.length - 1) onDone();
        else setStepIdx(stepIdx + 1);
        return;
      }

      const parentStep = steps[stepIdx];
      // 분기의 분기는 같은 메인 아래 다음 형제로 평탄화 (3-depth 금지)
      const parentMainStepId = parentStep?._meta
        ? parentStep._meta.parentMainStepId
        : parentStep?.id ?? 0;
      // 같은 메인 아래 이미 삽입된 형제 수 = 새 단계의 siblingIndex
      const siblingIndex = steps.filter(
        (s) => s._meta?.parentMainStepId === parentMainStepId,
      ).length;
      insertStepAt(stepIdx + 1, { ...option.stageContent, _meta: { parentMainStepId, siblingIndex } });
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
    if (stepIdx === 0) {
      onPrev();
    } else {
      if (sessionId) {
        logEvent("sl_step_navigate", {
          session_id: sessionId,
          from_idx: stepIdx,
          to_idx: stepIdx - 1,
          direction: "back",
        });
      }
      setStepIdx(stepIdx - 1);
    }
  };
  const goNext = () => {
    if (!isEvaluated) {
      showToast("답변 제출이 필요합니다");
      return;
    }
    if (isBranchGated) {
      showToast("분기 옵션을 먼저 선택해주세요");
      return;
    }
    if (stepIdx >= steps.length - 1) {
      onDone();
    } else {
      if (sessionId) {
        logEvent("sl_step_navigate", {
          session_id: sessionId,
          from_idx: stepIdx,
          to_idx: stepIdx + 1,
          direction: "next",
        });
      }
      setStepIdx(stepIdx + 1);
    }
  };
  // 단계 칩 클릭: 전진 방향은 분기 게이트 체크 적용.
  // 후진(i <= stepIdx)은 항상 허용, 전진(i > stepIdx)은 분기 미완료 시 차단.
  const handleChipClick = (i: number) => {
    if (branchEnabled && i > stepIdx && !!step && !branchedStepIds.has(step.id)) {
      showToast("분기 옵션을 먼저 선택해주세요");
      return;
    }
    setStepIdx(i);
  };
  const skipStep = () => {
    if (isEvaluated) return;
    const nextSkips = { ...skips };
    for (const q of step?.questions ?? []) nextSkips[q.id] = true;
    setSkips(nextSkips);
  };
  // 분기 평가(openBranch) 입력을 현재 단계 기준으로 구성한다. 최초 제출과 스냅샷 복구 재요청이 공유.
  const buildBranchInput = (s: Step) => ({
    concept,
    level: safeLevel,
    step: s,
    questions: s.questions
      .filter((q) => !skips[q.id])
      .map((q) => ({ id: q.id, q: q.q, answer: answers[q.id] || "" })),
    roadmapOutlineText: steps.map((x, i) => `${i + 1}. ${x.title} - ${x.desc}`).join("\n"),
  });

  const submitAnswers = () => {
    if (!step || isEvaluating || isEvaluated) return;
    // 계측: 제출되는 각 질문(스킵 제외)마다 sl_answer_submit emit (fire-and-forget)
    if (sessionId) {
      for (const q of step.questions.filter((q) => !skips[q.id])) {
        logEvent("sl_answer_submit", { session_id: sessionId, step_idx: stepIdx, question_id: q.id });
      }
    }
    void submitEvaluation(concept, safeLevel, stepIdx, answers, skips, mode);
    // "가볍게" 모드는 분기 없이 평가만 하고 끝. (사용자는 푸터의 "다음 개념" 으로 진행)
    if (!branchEnabled) return;
    // 그 외 모드는 분기 평가도 백그라운드로 시작. 사용자는 "평가 보기" 버튼으로 다이얼로그를 연다.
    void branch.openBranch(buildBranchInput(step));
  };

  // "평가 보기" 클릭. 분기 스냅샷이 살아있으면(choosing/error 또는 hydrate 복원) 다이얼로그만 연다.
  // 스냅샷이 없는 경우(평가는 끝났지만 분기 평가가 에러였거나 로딩 중 이탈해 영속 안 됨)
  // 분기 평가를 재요청해 복구한다 - 게이트에 걸렸는데 다이얼로그를 못 여는 데드락을 막는다.
  const handleOpenBranch = () => {
    setBranchVisible(true);
    if (!branchReady && step) void branch.openBranch(buildBranchInput(step));
  };

  // 두 호출의 합산 로딩/완료 상태. light 모드는 분기 호출이 없으므로 평가만으로 완료를 판정한다.
  const branchLoading = branchEnabled && branch.mode === "loading";
  const branchReady = branchEnabled && (branch.mode === "choosing" || branch.mode === "error");
  const fullLoading = isEvaluating || branchLoading;
  const fullReady = branchEnabled ? isEvaluated && branchReady : isEvaluated;

  const detailLoading = detailStatus === "loading" || detailStatus === "idle";
  const detailErrored = detailStatus === "error";
  // body 는 streaming 중에도 렌더되지만, questions/제출 영역은 complete(ready) 후에만 노출.
  const detailReady = detailStatus === "ready";

  const gradeFor = (qid: string) =>
    evalResult?.evaluations.find((e) => e.id === qid);

  // 가로/세로 두 방향이 공유하는 조각들 (래퍼만 방향별로 달라진다).
  // light 모드는 평가 완료 후 "평가 보기"(분기 다이얼로그)가 없으므로 버튼을 숨기고 푸터로 진행한다.
  // 다시 답변하기: 평가가 끝나(잠긴) 단계에서 노출. 마치기 전이면 언제든 잠금을 풀 수 있다.
  const reanswerButton = (
    <button
      className="lv-btn-ghost lv-reanswer"
      type="button"
      onClick={handleReanswer}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 14L4 9l5-5" />
        <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
      </svg>
      다시 답변하기
    </button>
  );
  // 제출/재답변 액션 영역. 로딩 > 평가완료(잠김) > 미제출 순으로 분기.
  const submitButton = fullLoading ? (
    <button
      className="lv-btn-holo lv-submit is-loading"
      type="button"
      disabled
      aria-busy
    >
      <span className="lv-submit-icon" aria-hidden>{I.brand}</span>
      평가 중…
    </button>
  ) : isEvaluated ? (
    <>
      {/* 분기가 준비됐거나(branchReady) 게이트에 걸린(isBranchGated) 동안 항상 "평가 보기"를 노출한다.
          스냅샷이 휘발된 게이트 상태에서도 버튼이 사라지지 않아야 다이얼로그로 복귀할 수 있다. */}
      {branchEnabled && (branchReady || isBranchGated) && (
        <button
          className="lv-btn-holo lv-submit"
          type="button"
          onClick={handleOpenBranch}
        >
          <span className="lv-submit-icon" aria-hidden>{I.brand}</span>
          평가 보기
        </button>
      )}
      {reanswerButton}
    </>
  ) : (
    <button
      className="lv-btn-holo lv-submit"
      type="button"
      onClick={submitAnswers}
    >
      <span className="lv-submit-icon" aria-hidden>{I.brand}</span>
      답변 제출하기
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
            onClick={() => loadStepDetail(concept, safeLevel, stepIdx, mode)}
          >
            다시 시도
          </button>
        </div>
      )}
      {!detailLoading && !detailErrored && step.body && (
        <Markdown text={step.body} streaming={detailStatus === "streaming"} />
      )}
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
            onClick={() => submitEvaluation(concept, safeLevel, stepIdx, answers, skips, mode)}
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
          // 모르겠어요 표시(채점 전): 입력 필드를 안내 패널로 치환
          const isDunno = isSkipped && !locked;
          return (
            <div
              key={q.id}
              className={
                "qa-pair" +
                (isDunno ? " is-dunno" : isSkipped ? " is-skipped" : "") +
                (ev ? ` is-graded grade-${ev.grade}` : "")
              }
            >
              <div className="qa-head">
                <span className="qa-num">Q{i + 1}</span>
                <span className="qa-question"><MathText text={q.q} /></span>
                {ev && !isSkipped && (
                  <span className={`grade-badge grade-${ev.grade}`}>{GRADE_LABEL[ev.grade]}</span>
                )}
              </div>
              {isDunno ? (
                <div className="qa-dunno-panel">
                  <span className="qa-dunno-ico" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M9.1 9a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.5-2.8 2.5" />
                      <line x1="12" y1="17" x2="12" y2="17" />
                    </svg>
                  </span>
                  <div className="qa-dunno-text">
                    <strong>모르겠다고 표시했어요</strong>
                    <span>다음 학습에서 다시 만나요</span>
                  </div>
                  <button
                    type="button"
                    className="qa-dunno-undo"
                    onClick={() => setSkips({ ...skips, [q.id]: false })}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M9 14L4 9l5-5" />
                      <path d="M4 9h11a5 5 0 0 1 0 10h-1" />
                    </svg>
                    되돌리기
                  </button>
                </div>
              ) : (
                <>
                  <QaAnswer
                    value={val}
                    readOnly={locked}
                    onChange={(v) => {
                      if (locked) return;
                      setAnswers({ ...answers, [q.id]: v });
                    }}
                    onBlur={() => {
                      onAnswerCommit?.();
                      if (sessionId && val && !locked) {
                        logEvent("sl_answer_edit", {
                          session_id: sessionId,
                          step_idx: stepIdx,
                          question_id: q.id,
                        });
                      }
                    }}
                  />
                  {ev && !isSkipped && (
                    <div className="qa-feedback">
                      <span className="qa-feedback-label">AI 피드백</span>
                      <p><MathText text={ev.feedback} /></p>
                    </div>
                  )}
                  {!locked && (
                    <div className="qa-foot">
                      <button
                        type="button"
                        className="qa-dunno"
                        onClick={() => setSkips({ ...skips, [q.id]: true })}
                      >
                        모르겠어요
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
    </>
  ) : null;

  // 전체 학습 진행도(현재 순번/전체) - 미니 바 하단 holo 진행 바 width.
  const progressPct = steps.length
    ? Math.min(100, Math.round(((stepIdx + 1) / steps.length) * 100))
    : 0;
  // 헤더 칩과 미니 바 칩이 동일 소스를 쓰도록 한 곳에서 렌더한다.
  const renderStepItems = () =>
    steps.map((s, i) => (
      <li
        key={s.id}
        className={
          "lv-step" +
          (i === stepIdx ? " is-curr" : "") +
          (i < stepIdx ? " is-done" : "") +
          (s._meta ? " is-inserted" : "")
        }
      >
        <button
          type="button"
          onClick={() => handleChipClick(i)}
          aria-disabled={
            branchEnabled && i > stepIdx && !!step && !branchedStepIds.has(step.id)
              ? true
              : undefined
          }
        >
          <span className="lv-step-num">{getLabelForStep(steps, i)}</span>
          <span className="lv-step-title">{s.title}</span>
        </button>
      </li>
    ));

  return (
    <div className="lv-board">
      <header className="lv-bar" ref={headRef}>
        <div className="lv-bar-top">
          <span className="lv-bar-eyebrow">학습 진행</span>
          <span className="lv-bar-title">{concept}</span>
          <span className="lv-bar-meta">
            {Math.min(stepIdx + 1, Math.max(steps.length, 1))} / {steps.length}
          </span>
          <span className="lv-bar-spacer" />
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
        <ol className="lv-steps">{renderStepItems()}</ol>
      </header>

      {/* 페이지 최상단(top:0)에 항상 보이는 얇은 holo 진행 라인 (전체 로드맵 진행도) */}
      <div className="lvr-topprog" aria-hidden>
        <span style={{ width: progressPct + "%" }} />
      </div>

      {/* 스크롤 시 헤더가 사라지면 위에서 슬라이드+페이드로 내려오는 압축 로드맵 미니 바 */}
      <div ref={miniRef} className={"lv-mini" + (miniVisible ? " is-shown" : "")} aria-hidden={!miniVisible}>
        <div className="lv-mini-inner">
          <span className="lv-mini-title">{concept}</span>
          <ol className="lv-steps lv-mini-steps" ref={miniRailRef}>
            {renderStepItems()}
          </ol>
        </div>
      </div>

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
              {detailReady && submitButton && (
                <div className="lv2-right-sticky-bottom">{submitButton}</div>
              )}
            </div>
          </div>
        ) : (
          /* ── 세로형: 접이식 설명 ▸ 질문 (기본) ── */
          <div className="lv-body lvv-body">
            <section className={"lvv-explain" + (explainOpen ? "" : " is-closed")}>
              <div className="lvv-explain-head">
                <span className="eyebrow">개념 설명</span>
                <span className="ttl">{step.title}</span>
                <span className="grow" />
                <button
                  className="lvv-explain-toggle"
                  type="button"
                  aria-expanded={explainOpen}
                  onClick={() => setExplainOpen((v) => !v)}
                >
                  <span className="toggle">{explainOpen ? "접기" : "펼쳐 보기"}</span>
                  <span className="chev">▾</span>
                </button>
              </div>
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
              {detailReady && submitButton && (
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
          className={"lv-btn-holo" + (isBranchGated ? " is-disabled" : "")}
          type="button"
          onClick={goNext}
          disabled={detailLoading || isEvaluating}
          aria-disabled={isBranchGated ? true : undefined}
        >
          {stepIdx >= steps.length - 1 ? "학습 마치기" : "다음 개념"} →
        </button>
      </div>

      {toast && <div className="lv-toast" role="status">{toast}</div>}

      <BranchDialog
        open={branchVisible && (branch.mode === "choosing" || branch.mode === "error")}
        evaluationText={branch.evaluationText}
        options={[...normalizeBranchOptions(branch.options, steps, stepIdx), REANSWER_OPTION]}
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
