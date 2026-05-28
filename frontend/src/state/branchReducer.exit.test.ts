import { describe, test, expect } from "vitest";
import { reduceBranch, type BranchState } from "./branchReducer";

describe("reduceBranch - exit action", () => {
  const baseState: BranchState = {
    roadmapStages: [
      { id: 1, title: "a", desc: "", body: "", questions: [] },
    ],
    currentStageIndex: 0,
    stage: "explain",
  };

  test("exit 액션 처리 시 stage 가 done 으로 전이된다", () => {
    const next = reduceBranch(baseState, { type: "exit" });
    expect(next.stage).toBe("done");
  });

  test("exit 액션은 currentStageIndex 와 roadmapStages 를 보존한다", () => {
    const state: BranchState = { ...baseState, currentStageIndex: 2, stage: "questions" };
    const next = reduceBranch(state, { type: "exit" });
    expect(next.currentStageIndex).toBe(2);
    expect(next.roadmapStages).toEqual(state.roadmapStages);
  });

  test("reduceBranch 는 입력 상태를 변형하지 않는다 (순수성)", () => {
    const snapshot = JSON.stringify(baseState);
    reduceBranch(baseState, { type: "exit" });
    expect(JSON.stringify(baseState)).toBe(snapshot);
  });
});
