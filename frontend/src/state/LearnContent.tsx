import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
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
  generateStepDetail,
  type StepEvaluation,
} from "../api/claudeContent";
import { buildRoadmapStages } from "./roadmap";

type LoadStatus = "idle" | "loading" | "ready" | "error";
type ErrInfo = { code: string; message: string };

interface LearnContentValue {
  probeQuestions: ProbeQuestion[];
  probeStatus: LoadStatus;
  probeError: ErrInfo | null;
  probeFromFallback: boolean;
  loadProbe: (concept: string, materials?: string) => Promise<void>;

  steps: Step[];
  outlineStatus: LoadStatus;
  outlineError: ErrInfo | null;
  loadOutline: (concept: string, level: number) => Promise<void>;

  stepDetailStatus: Record<number, LoadStatus>;
  stepDetailErrors: Record<number, ErrInfo | null>;
  loadStepDetail: (concept: string, level: number, stepIdx: number) => Promise<void>;

  stepEvaluations: Record<number, StepEvaluation>;
  stepEvalStatus: Record<number, LoadStatus>;
  stepEvalErrors: Record<number, ErrInfo | null>;
  submitEvaluation: (
    concept: string,
    level: number,
    stepIdx: number,
    answers: Record<string, string>,
    skips: Record<string, boolean>,
  ) => Promise<void>;

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

export function LearnContentProvider({ children }: { children: ReactNode }) {
  const [probeQuestions, setProbeQuestions] = useState<ProbeQuestion[]>(FALLBACK_PROBES);
  const [probeStatus, setProbeStatus] = useState<LoadStatus>("idle");
  const [probeError, setProbeError] = useState<ErrInfo | null>(null);
  const [probeFromFallback, setProbeFromFallback] = useState(false);

  const [steps, setStepsState] = useState<Step[]>([]);
  const stepsRef = useRef<Step[]>([]);
  const setSteps = useCallback((updater: Step[] | ((cur: Step[]) => Step[])) => {
    setStepsState((cur) => {
      const next = typeof updater === "function" ? (updater as (c: Step[]) => Step[])(cur) : updater;
      stepsRef.current = next;
      return next;
    });
  }, []);
  const [outlineStatus, setOutlineStatus] = useState<LoadStatus>("idle");
  const [outlineError, setOutlineError] = useState<ErrInfo | null>(null);

  const [stepDetailStatus, setStepDetailStatus] = useState<Record<number, LoadStatus>>({});
  const [stepDetailErrors, setStepDetailErrors] = useState<Record<number, ErrInfo | null>>({});
  const inflightRef = useRef<Set<number>>(new Set());

  const [stepEvaluations, setStepEvaluations] = useState<Record<number, StepEvaluation>>({});
  const [stepEvalStatus, setStepEvalStatus] = useState<Record<number, LoadStatus>>({});
  const [stepEvalErrors, setStepEvalErrors] = useState<Record<number, ErrInfo | null>>({});
  const evalInflightRef = useRef<Set<number>>(new Set());

  const loadProbe = useCallback(async (concept: string, materials?: string) => {
    setProbeStatus("loading");
    setProbeError(null);
    setProbeFromFallback(false);
    try {
      const qs = await generateProbeQuestions(concept, materials);
      setProbeQuestions(qs);
      setProbeStatus("ready");
    } catch (e) {
      setProbeError(toErr(e));
      setProbeQuestions(FALLBACK_PROBES);
      setProbeFromFallback(true);
      setProbeStatus("error");
    }
  }, []);

  const loadOutline = useCallback(async (concept: string, level: number) => {
    setOutlineStatus("loading");
    setOutlineError(null);
    setSteps([]);
    setStepDetailStatus({});
    setStepDetailErrors({});
    inflightRef.current.clear();
    try {
      const outline = await generateRoadmapOutline(concept, level);
      const placeholders: Step[] = buildRoadmapStages(outline);
      setSteps(placeholders);
      setOutlineStatus("ready");
    } catch (e) {
      setOutlineError(toErr(e));
      setOutlineStatus("error");
    }
  }, []);

  const loadStepDetail = useCallback(
    async (concept: string, level: number, stepIdx: number) => {
      if (inflightRef.current.has(stepIdx)) return;
      inflightRef.current.add(stepIdx);
      setStepDetailStatus((m) => ({ ...m, [stepIdx]: "loading" }));
      setStepDetailErrors((m) => ({ ...m, [stepIdx]: null }));
      try {
        const outline = stepsRef.current.map((s) => ({ title: s.title, desc: s.desc }));
        const detail = await generateStepDetail(concept, level, outline, stepIdx);
        setSteps((cur) =>
          cur.map((s, i) =>
            i === stepIdx ? { ...s, body: detail.body, questions: detail.questions } : s,
          ),
        );
        setStepDetailStatus((m) => ({ ...m, [stepIdx]: "ready" }));
      } catch (e) {
        setStepDetailErrors((m) => ({ ...m, [stepIdx]: toErr(e) }));
        setStepDetailStatus((m) => ({ ...m, [stepIdx]: "error" }));
      } finally {
        inflightRef.current.delete(stepIdx);
      }
    },
    [],
  );

  const submitEvaluation = useCallback(
    async (
      concept: string,
      level: number,
      stepIdx: number,
      answers: Record<string, string>,
      skips: Record<string, boolean>,
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

  const insertStepAt = useCallback(
    (index: number, step: Step): number => {
      const cur = stepsRef.current;
      const maxId = cur.reduce((m, s) => Math.max(m, s.id), 0);
      const assignedId = maxId + 1;
      const inserted: Step = { ...step, id: assignedId };
      const clampedIndex = Math.max(0, Math.min(index, cur.length));
      setSteps([...cur.slice(0, clampedIndex), inserted, ...cur.slice(clampedIndex)]);
      return assignedId;
    },
    [setSteps],
  );

  const reset = useCallback(() => {
    setProbeQuestions(FALLBACK_PROBES);
    setProbeStatus("idle");
    setProbeError(null);
    setProbeFromFallback(false);
    setSteps([]);
    setOutlineStatus("idle");
    setOutlineError(null);
    setStepDetailStatus({});
    setStepDetailErrors({});
    inflightRef.current.clear();
    setStepEvaluations({});
    setStepEvalStatus({});
    setStepEvalErrors({});
    evalInflightRef.current.clear();
  }, []);

  return (
    <Ctx.Provider
      value={{
        probeQuestions,
        probeStatus,
        probeError,
        probeFromFallback,
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
