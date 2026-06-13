import { useCallback, useState } from "react";
import type { BranchOption, EvaluationResponse } from "../api/contract";
import type { Step } from "../stages/data";
import { generateBranchEvaluation, ClaudeContentError } from "../api/claudeContent";
import { reduceBranch, type BranchState } from "./branchReducer";

/**
 * 분기 다이얼로그 가시 상태.
 *  - closed: 다이얼로그 안 떠 있음
 *  - choosing: 평가 성공, 선택지 표시 중
 *  - error: LLM 응답 파싱 실패 또는 네트워크 오류
 *  - loading: 평가 요청 진행 중 (재시도 포함)
 */
export type BranchDialogMode = "closed" | "choosing" | "error" | "loading";

export interface BranchPhaseSnapshot {
  mode: BranchDialogMode;
  evaluationText: string;
  options: BranchOption[];
  retryCount: number;
  errorMessage: string | null;
  technicalDetail: string | null;
}

export interface OpenBranchInput {
  concept: string;
  level: number;
  step: Step;
  questions: { id: string; q: string; answer: string }[];
  roadmapOutlineText: string;
}

const initialSnapshot: BranchPhaseSnapshot = {
  mode: "closed",
  evaluationText: "",
  options: [],
  retryCount: 0,
  errorMessage: null,
  technicalDetail: null,
};

/**
 * 분기 다이얼로그 + 분기 선택 + 재시도 흐름을 한 훅으로 묶는다.
 * Learn.tsx 같은 stage 컴포넌트에서 1회 mount 후 핸들러를 통해 제어.
 *
 *  - openBranch(input): 평가를 호출하고 다이얼로그를 띄움
 *  - chooseBranch(option, steps, currentIndex): 선택된 옵션을 reduceBranch 로 적용
 *  - retryBranch(input): 같은 input 으로 다시 호출, retryCount 증가
 *  - closeBranch(): 다이얼로그를 닫고 스냅샷 초기화
 *
 * steps/currentIndex 갱신은 외부(LearnContent) 가 책임. 본 훅은 어떤 액션을
 * 어떻게 적용할지(BranchAction 모양)만 반환한다.
 */
export function useBranchPhase() {
  const [snapshot, setSnapshot] = useState<BranchPhaseSnapshot>(initialSnapshot);

  const runEvaluation = useCallback(async (input: OpenBranchInput, retryIncrement: number) => {
    setSnapshot((cur) => ({
      ...cur,
      mode: "loading",
      retryCount: cur.retryCount + retryIncrement,
      errorMessage: null,
      technicalDetail: null,
    }));
    try {
      const result = await generateBranchEvaluation(
        input.concept,
        input.level,
        input.step.title,
        input.step.desc,
        input.step.body,
        input.questions,
        input.roadmapOutlineText,
      );
      if ("parseError" in result) {
        setSnapshot((cur) => ({
          ...cur,
          mode: "error",
          errorMessage: "응답을 분기 형식으로 해석하지 못했습니다.",
          technicalDetail: result.parseError,
          options: [],
          evaluationText: "",
        }));
        return;
      }
      const ok = result as EvaluationResponse;
      setSnapshot((cur) => ({
        ...cur,
        mode: "choosing",
        evaluationText: ok.evaluationText,
        options: ok.branchOptions,
        errorMessage: null,
        technicalDetail: null,
      }));
    } catch (e) {
      const err = e instanceof ClaudeContentError ? e : new ClaudeContentError("INTERNAL_ERROR", (e as Error).message);
      setSnapshot((cur) => ({
        ...cur,
        mode: "error",
        errorMessage: "분기 옵션을 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
        technicalDetail: `${err.code}: ${err.message}`,
        options: [],
        evaluationText: "",
      }));
    }
  }, []);

  const openBranch = useCallback(
    async (input: OpenBranchInput) => {
      setSnapshot({ ...initialSnapshot, mode: "loading" });
      await runEvaluation(input, 0);
    },
    [runEvaluation],
  );

  const retryBranch = useCallback(
    async (input: OpenBranchInput) => {
      await runEvaluation(input, 1);
    },
    [runEvaluation],
  );

  const closeBranch = useCallback(() => {
    setSnapshot(initialSnapshot);
  }, []);

  /**
   * 선택된 옵션을 reduceBranch 에 위임하여 새 BranchState 를 계산한다.
   * 호출자(LearnContent)는 반환된 state 로 자기 steps/currentStageIndex 를 업데이트.
   */
  const chooseBranch = useCallback(
    (option: BranchOption, current: BranchState): BranchState => {
      // reanswer 는 분기 상태를 바꾸지 않는 클라이언트 전용 액션(호출자가 가로챔). 여기 오면 무시.
      if (option.type === "reanswer") return current;
      const next = reduceBranch(current, {
        type: option.type,
        stageContent: option.stageContent,
      });
      setSnapshot(initialSnapshot);
      return next;
    },
    [],
  );

  return {
    ...snapshot,
    openBranch,
    chooseBranch,
    retryBranch,
    closeBranch,
  };
}
