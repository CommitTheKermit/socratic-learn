import type { Step } from "../stages/data";

export type BranchActionType =
  | "roadmap_next"
  | "ai_recommended"
  | "additional"
  | "exit";

export interface BranchState {
  roadmapStages: Step[];
  currentStageIndex: number;
  stage: "explain" | "questions" | "answering" | "done";
}

export interface BranchAction {
  type: BranchActionType;
  stageContent?: Step | null;
}

function withDoneIfOutOfBounds(state: BranchState): BranchState {
  if (state.currentStageIndex >= state.roadmapStages.length) {
    return { ...state, stage: "done" };
  }
  return state;
}

export function reduceBranch(
  state: BranchState,
  action: BranchAction
): BranchState {
  switch (action.type) {
    case "roadmap_next":
      return withDoneIfOutOfBounds({
        ...state,
        currentStageIndex: state.currentStageIndex + 1,
      });

    case "ai_recommended":
    case "additional": {
      if (!action.stageContent) return state;
      const insertAt = state.currentStageIndex + 1;
      const nextStages = [
        ...state.roadmapStages.slice(0, insertAt),
        action.stageContent,
        ...state.roadmapStages.slice(insertAt),
      ];
      return { ...state, roadmapStages: nextStages };
    }

    case "exit":
      return { ...state, stage: "done" };

    default:
      return state;
  }
}
