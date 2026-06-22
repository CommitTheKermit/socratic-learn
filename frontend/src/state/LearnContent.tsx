import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  PROBE_QUESTIONS as FALLBACK_PROBES,
  type ProbeQuestion,
  type Step,
} from "../stages/data";
import {
  ClaudeContentError,
  generateAnswerEvaluation,
  generateProbeQuestions,
  generateRoadmapOutline,
  validateInput,
  type StepEvaluation,
} from "../api/claudeContent";
import { streamStepDetail, type StreamHandle } from "../api/stepDetailStream";
import type { LearnMode } from "../api/contract";
import type { StepBranchResult } from "./sessionState";
import { buildRoadmapStages } from "./roadmap";

// "streaming": body 토큰이 점진적으로 들어오는 중(questions 는 아직 없음). complete 시 "ready".
type LoadStatus = "idle" | "loading" | "streaming" | "ready" | "error";
type ErrInfo = { code: string; message: string };

interface LearnContentValue {
  probeQuestions: ProbeQuestion[];
  probeStatus: LoadStatus;
  probeError: ErrInfo | null;
  probeFromFallback: boolean;
  /** 학습 주제가 부적합으로 판정돼 probe 생성을 막은 상태(차단 모달 표시 신호). */
  probeInvalid: boolean;
  loadProbe: (concept: string, materials?: string, mode?: string) => Promise<void>;

  steps: Step[];
  outlineStatus: LoadStatus;
  outlineError: ErrInfo | null;
  loadOutline: (concept: string, level: number, mode?: string) => Promise<void>;

  stepDetailStatus: Record<number, LoadStatus>;
  stepDetailErrors: Record<number, ErrInfo | null>;
  loadStepDetail: (concept: string, level: number, stepIdx: number, mode?: string) => Promise<void>;

  stepEvaluations: Record<number, StepEvaluation>;
  stepEvalStatus: Record<number, LoadStatus>;
  stepEvalErrors: Record<number, ErrInfo | null>;
  submitEvaluation: (
    concept: string,
    level: number,
    stepIdx: number,
    answers: Record<string, string>,
    skips: Record<string, boolean>,
    mode?: string,
  ) => Promise<void>;
  /**
   * 한 단계의 평가 결과를 비워 잠금을 푼다(재답변용).
   * stepEvaluations/Status/Errors 의 해당 stepIdx 항목을 제거 → isEvaluated 가 false 가 되어
   * 답변 입력칸이 다시 편집 가능해지고 "답변 제출하기" 버튼이 복귀한다.
   */
  clearEvaluation: (stepIdx: number) => void;

  /**
   * stepIdx 별 분기 평가 스냅샷(평가 텍스트/선택지/병합 여부).
   * 재접속/새로고침 시 "평가 보기"로 분기 다이얼로그를 복원하는 출처가 된다.
   */
  stepBranches: Record<number, StepBranchResult>;
  /** 한 단계의 분기 평가 결과를 저장(또는 덮어쓰기)한다. choosing 성공 시점에 호출. */
  setStepBranch: (stepIdx: number, result: StepBranchResult) => void;
  /** 분기 선택이 완료된 step.id 집합. 게이트 해제(다음 개념 진행) 판정의 출처. */
  branchedStepIds: Set<number>;
  /** 한 step.id 를 분기 선택 완료로 표시한다(게이트 해제). */
  markBranched: (stepId: number) => void;

  /**
   * 분기 선택의 결과로 새 학습 단계를 currentIndex+1 위치에 삽입한다.
   * - 신규 step.id 는 현 steps 의 max id + 1 로 강제 재할당해 충돌을 방지
   * - 삽입된 id 를 반환하여 외부에서 inserted 목록 추적 가능
   */
  insertStepAt: (index: number, step: Step) => number;

  reset: () => void;
}

const Ctx = createContext<LearnContentValue | null>(null);

function toErr(e: unknown): ErrInfo {
  return e instanceof ClaudeContentError
    ? { code: e.code, message: e.message }
    : { code: "INTERNAL_ERROR", message: (e as Error).message };
}

/**
 * 세션에 영속화된 AI 산출물. LearnContentProvider 의 초기 상태로 주입되어
 * 재접속/세션 전환 시 첫 렌더부터 "ready" 로 복원된다(=재로딩 안 함).
 */
export interface LearnContentInitial {
  probeQuestions?: ProbeQuestion[];
  probeReady?: boolean;
  steps?: Step[];
  stepEvaluations?: Record<number, StepEvaluation>;
  stepBranches?: Record<number, StepBranchResult>;
  branchedStepIds?: number[];
}

/** 복원된 steps 로부터 각 단계의 상세 로딩 상태를 도출한다(본문+질문이 있으면 ready). */
function deriveDetailStatus(steps?: Step[]): Record<number, LoadStatus> {
  const m: Record<number, LoadStatus> = {};
  steps?.forEach((s, i) => {
    if (s.body && s.questions.length) m[i] = "ready";
  });
  return m;
}

/** 복원된 평가 맵으로부터 각 단계의 평가 상태를 도출한다(존재하면 ready). */
function deriveEvalStatus(evals?: Record<number, StepEvaluation>): Record<number, LoadStatus> {
  const m: Record<number, LoadStatus> = {};
  if (evals) for (const k of Object.keys(evals)) m[Number(k)] = "ready";
  return m;
}

/**
 * 인덱스(stepIdx) 키 맵에서 from 이상 키를 +1 시프트한다.
 * steps 배열 중간에 단계를 삽입하면 그 뒤 단계들의 위치 인덱스가 한 칸씩 밀리므로,
 * 같은 인덱스로 귀속되던 상세/평가/분기 상태도 함께 밀어줘야 단계-상태 매핑이 어긋나지 않는다.
 * (branchedStepIds 는 step.id 키라 시프트 대상이 아니다.)
 */
function shiftIndexKeys<T>(m: Record<number, T>, from: number): Record<number, T> {
  const next: Record<number, T> = {};
  for (const key of Object.keys(m)) {
    const idx = Number(key);
    next[idx >= from ? idx + 1 : idx] = m[idx];
  }
  return next;
}

export function LearnContentProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: LearnContentInitial;
}) {
  const restoredProbe = !!(initial?.probeReady && initial.probeQuestions?.length);
  const restoredSteps = initial?.steps && initial.steps.length ? initial.steps : null;

  const [probeQuestions, setProbeQuestions] = useState<ProbeQuestion[]>(() =>
    restoredProbe ? initial!.probeQuestions! : FALLBACK_PROBES,
  );
  const [probeStatus, setProbeStatus] = useState<LoadStatus>(() =>
    restoredProbe ? "ready" : "idle",
  );
  const [probeError, setProbeError] = useState<ErrInfo | null>(null);
  const [probeFromFallback, setProbeFromFallback] = useState(false);
  const [probeInvalid, setProbeInvalid] = useState(false);

  const [steps, setStepsState] = useState<Step[]>(() => restoredSteps ?? []);
  const stepsRef = useRef<Step[]>(restoredSteps ?? []);
  const setSteps = useCallback((updater: Step[] | ((cur: Step[]) => Step[])) => {
    setStepsState((cur) => {
      const next = typeof updater === "function" ? (updater as (c: Step[]) => Step[])(cur) : updater;
      stepsRef.current = next;
      return next;
    });
  }, []);
  const [outlineStatus, setOutlineStatus] = useState<LoadStatus>(() =>
    restoredSteps ? "ready" : "idle",
  );
  const [outlineError, setOutlineError] = useState<ErrInfo | null>(null);

  const [stepDetailStatus, setStepDetailStatus] = useState<Record<number, LoadStatus>>(() =>
    deriveDetailStatus(restoredSteps ?? undefined),
  );
  const [stepDetailErrors, setStepDetailErrors] = useState<Record<number, ErrInfo | null>>({});
  const inflightRef = useRef<Set<number>>(new Set());
  // 진행 중인 본문 스트림 핸들. 세션 전환/재학습(reset, loadOutline) 시 abort 해야
  // 죽은 스트림의 onDelta/onComplete 가 새 세션 steps 에 본문을 덮어쓰는 레이스를 막는다.
  const stepStreamsRef = useRef<Map<number, StreamHandle>>(new Map());
  // 세대(epoch) 가드. reset/loadOutline 마다 증가시키고, 스트림 시작 시점의 epoch 를
  // 캡처해 콜백에서 비교한다. 다른 세대(이전 세션)의 콜백은 상태를 건드리지 않는다.
  const epochRef = useRef(0);
  const abortStepStreams = useCallback(() => {
    epochRef.current += 1;
    stepStreamsRef.current.forEach((h) => h.abort());
    stepStreamsRef.current.clear();
  }, []);

  const [stepEvaluations, setStepEvaluations] = useState<Record<number, StepEvaluation>>(
    () => initial?.stepEvaluations ?? {},
  );
  const [stepEvalStatus, setStepEvalStatus] = useState<Record<number, LoadStatus>>(() =>
    deriveEvalStatus(initial?.stepEvaluations),
  );
  const [stepEvalErrors, setStepEvalErrors] = useState<Record<number, ErrInfo | null>>({});
  const evalInflightRef = useRef<Set<number>>(new Set());

  // 분기 평가 스냅샷(stepIdx별)과 분기 선택 완료 step.id 집합. 둘 다 세션에 영속화되며
  // initial 로 복원된다. stepBranches 는 "평가 보기" 복원, branchedStepIds 는 게이트 해제 복원용.
  const [stepBranches, setStepBranches] = useState<Record<number, StepBranchResult>>(
    () => initial?.stepBranches ?? {},
  );
  const [branchedStepIds, setBranchedStepIds] = useState<Set<number>>(
    () => new Set(initial?.branchedStepIds ?? []),
  );
  const setStepBranch = useCallback((stepIdx: number, result: StepBranchResult) => {
    setStepBranches((m) => ({ ...m, [stepIdx]: result }));
  }, []);
  const markBranched = useCallback((stepId: number) => {
    setBranchedStepIds((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  }, []);

  // 언마운트(세션 전환으로 Provider 가 key 재마운트되는 경우 포함) 시 진행 중 스트림을 정리한다.
  useEffect(() => () => abortStepStreams(), [abortStepStreams]);

  const loadProbe = useCallback(async (concept: string, materials?: string, mode?: string) => {
    setProbeStatus("loading");
    setProbeError(null);
    setProbeFromFallback(false);
    setProbeInvalid(false);
    // 값싼 Haiku 게이트: 학습 주제가 부적합하면 probe 생성(Sonnet)을 건너뛰고 차단 신호만 올린다.
    // probeStatus 는 "loading" 으로 두어 진입 effect 의 재트리거(probeStatus==="idle")를 막는다.
    // 게이트 장애(네트워크/API)면 학습을 막지 않도록 통과시킨다(fail-open).
    try {
      const ok = await validateInput(concept.trim());
      if (!ok) {
        setProbeInvalid(true);
        return;
      }
    } catch {
      // fail-open: 검증 게이트 장애로 학습 자체가 막히지 않도록 통과시킨다.
    }
    try {
      const qs = await generateProbeQuestions(concept, materials, mode);
      setProbeQuestions(qs);
      setProbeStatus("ready");
    } catch (e) {
      setProbeError(toErr(e));
      setProbeQuestions(FALLBACK_PROBES);
      setProbeFromFallback(true);
      setProbeStatus("error");
    }
  }, []);

  const loadOutline = useCallback(async (concept: string, level: number, mode?: string) => {
    setOutlineStatus("loading");
    setOutlineError(null);
    setSteps([]);
    setStepDetailStatus({});
    setStepDetailErrors({});
    inflightRef.current.clear();
    abortStepStreams();
    try {
      const outline = await generateRoadmapOutline(concept, level, mode);
      const placeholders: Step[] = buildRoadmapStages(outline);
      setSteps(placeholders);
      setOutlineStatus("ready");
    } catch (e) {
      setOutlineError(toErr(e));
      setOutlineStatus("error");
    }
  }, [abortStepStreams, setSteps]);

  const loadStepDetail = useCallback(
    async (concept: string, level: number, stepIdx: number, mode?: string) => {
      if (inflightRef.current.has(stepIdx)) return;
      inflightRef.current.add(stepIdx);
      // 이 스트림이 속한 세대. 이후 reset/loadOutline 으로 epoch 가 바뀌면(= 세션 전환)
      // 이 스트림의 콜백은 더 이상 상태를 건드리지 않는다(stale write 방지).
      const myEpoch = epochRef.current;
      const isStale = () => myEpoch !== epochRef.current;
      setStepDetailStatus((m) => ({ ...m, [stepIdx]: "loading" }));
      setStepDetailErrors((m) => ({ ...m, [stepIdx]: null }));
      // 재시도 시 잔여 본문 제거.
      setSteps((cur) => cur.map((s, i) => (i === stepIdx ? { ...s, body: "" } : s)));

      const outline = stepsRef.current.map((s) => ({ title: s.title, desc: s.desc }));
      let acc = "";
      let settled = false;
      const handle = streamStepDetail(
        { concept, level, outline, stepIdx, mode: mode as LearnMode | undefined },
        {
          onDelta: (text) => {
            if (isStale()) return;
            acc += text;
            setStepDetailStatus((m) =>
              m[stepIdx] === "streaming" ? m : { ...m, [stepIdx]: "streaming" },
            );
            setSteps((cur) => cur.map((s, i) => (i === stepIdx ? { ...s, body: acc } : s)));
          },
          onComplete: ({ body, questions }) => {
            settled = true;
            if (isStale()) return;
            setSteps((cur) =>
              cur.map((s, i) => (i === stepIdx ? { ...s, body: body || acc, questions } : s)),
            );
            setStepDetailStatus((m) => ({ ...m, [stepIdx]: "ready" }));
          },
          onError: (err) => {
            settled = true;
            if (isStale()) return;
            setStepDetailErrors((m) => ({ ...m, [stepIdx]: err }));
            setStepDetailStatus((m) => ({ ...m, [stepIdx]: "error" }));
          },
        },
      );
      stepStreamsRef.current.set(stepIdx, handle);
      try {
        await handle.done;
        // 스트림이 complete/error 없이 끊긴 경우 방어. 단, 세션이 바뀌었으면(stale) 무시.
        if (!settled && !isStale()) {
          setStepDetailErrors((m) => ({
            ...m,
            [stepIdx]: { code: "STREAM_ERROR", message: "본문 스트림이 완료되지 않았습니다." },
          }));
          setStepDetailStatus((m) => ({ ...m, [stepIdx]: "error" }));
        }
      } finally {
        inflightRef.current.delete(stepIdx);
        if (stepStreamsRef.current.get(stepIdx) === handle) {
          stepStreamsRef.current.delete(stepIdx);
        }
      }
    },
    [setSteps],
  );

  const submitEvaluation = useCallback(
    async (
      concept: string,
      level: number,
      stepIdx: number,
      answers: Record<string, string>,
      skips: Record<string, boolean>,
      mode?: string,
    ) => {
      if (evalInflightRef.current.has(stepIdx)) return;
      const step = stepsRef.current[stepIdx];
      if (!step) return;
      evalInflightRef.current.add(stepIdx);
      setStepEvalStatus((m) => ({ ...m, [stepIdx]: "loading" }));
      setStepEvalErrors((m) => ({ ...m, [stepIdx]: null }));
      try {
        const items = step.questions
          .filter((q) => !skips[q.id])
          .map((q) => ({ id: q.id, q: q.q, answer: answers[q.id] || "" }));
        const evalResult = await generateAnswerEvaluation(
          concept,
          level,
          step.title,
          step.desc,
          step.body,
          items,
          mode,
        );
        setStepEvaluations((m) => ({ ...m, [stepIdx]: evalResult }));
        setStepEvalStatus((m) => ({ ...m, [stepIdx]: "ready" }));
      } catch (e) {
        setStepEvalErrors((m) => ({ ...m, [stepIdx]: toErr(e) }));
        setStepEvalStatus((m) => ({ ...m, [stepIdx]: "error" }));
      } finally {
        evalInflightRef.current.delete(stepIdx);
      }
    },
    [],
  );

  const clearEvaluation = useCallback((stepIdx: number) => {
    const omit = <T,>(m: Record<number, T>): Record<number, T> => {
      if (!(stepIdx in m)) return m;
      const next = { ...m };
      delete next[stepIdx];
      return next;
    };
    setStepEvaluations(omit);
    setStepEvalStatus(omit);
    setStepEvalErrors((m) => omit(m));
    evalInflightRef.current.delete(stepIdx);
  }, []);

  const insertStepAt = useCallback(
    (index: number, step: Step): number => {
      const cur = stepsRef.current;
      const maxId = cur.reduce((m, s) => Math.max(m, s.id), 0);
      const assignedId = maxId + 1;
      const inserted: Step = { ...step, id: assignedId };
      const clampedIndex = Math.max(0, Math.min(index, cur.length));
      setSteps([...cur.slice(0, clampedIndex), inserted, ...cur.slice(clampedIndex)]);
      // 삽입 지점 이후로 밀리는 단계들의 인덱스 키 상태도 함께 +1 시프트해 귀속을 유지한다.
      // (branchedStepIds 는 step.id 키라 시프트하지 않는다.)
      setStepDetailStatus((m) => shiftIndexKeys(m, clampedIndex));
      setStepDetailErrors((m) => shiftIndexKeys(m, clampedIndex));
      setStepEvaluations((m) => shiftIndexKeys(m, clampedIndex));
      setStepEvalStatus((m) => shiftIndexKeys(m, clampedIndex));
      setStepEvalErrors((m) => shiftIndexKeys(m, clampedIndex));
      setStepBranches((m) => shiftIndexKeys(m, clampedIndex));
      return assignedId;
    },
    [setSteps],
  );

  const reset = useCallback(() => {
    setProbeQuestions(FALLBACK_PROBES);
    setProbeStatus("idle");
    setProbeError(null);
    setProbeFromFallback(false);
    setProbeInvalid(false);
    setSteps([]);
    setOutlineStatus("idle");
    setOutlineError(null);
    setStepDetailStatus({});
    setStepDetailErrors({});
    inflightRef.current.clear();
    abortStepStreams();
    setStepEvaluations({});
    setStepEvalStatus({});
    setStepEvalErrors({});
    evalInflightRef.current.clear();
    setStepBranches({});
    setBranchedStepIds(new Set());
  }, [abortStepStreams]);

  return (
    <Ctx.Provider
      value={{
        probeQuestions,
        probeStatus,
        probeError,
        probeFromFallback,
        probeInvalid,
        loadProbe,
        steps,
        outlineStatus,
        outlineError,
        loadOutline,
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
        reset,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLearnContent() {
  const v = useContext(Ctx);
  if (!v) throw new Error("LearnContentProvider missing");
  return v;
}
