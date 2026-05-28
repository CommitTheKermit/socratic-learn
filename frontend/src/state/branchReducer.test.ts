import { describe, test, expect } from "vitest";
import { reduceBranch, type BranchState } from "./branchReducer";

describe("reduceBranch - roadmap_next", () => {
  const baseState: BranchState = {
    roadmapStages: [
      { id: 1, title: "a", desc: "", body: "", questions: [] },
      { id: 2, title: "b", desc: "", body: "", questions: [] },
      { id: 3, title: "c", desc: "", body: "", questions: [] },
    ],
    currentStageIndex: 0,
    stage: "explain",
  };

  test("roadmap_next 액션은 currentStageIndex 를 1 증가시킨다", () => {
    const next = reduceBranch(baseState, { type: "roadmap_next" });
    expect(next.currentStageIndex).toBe(1);
  });

  test("roadmap_next 는 이전 상태를 변형하지 않는다 (순수 함수)", () => {
    const next = reduceBranch(baseState, { type: "roadmap_next" });
    expect(baseState.currentStageIndex).toBe(0);
    expect(next).not.toBe(baseState);
  });

  test("연속 호출 시 누적 증가한다", () => {
    const s1 = reduceBranch(baseState, { type: "roadmap_next" });
    const s2 = reduceBranch(s1, { type: "roadmap_next" });
    expect(s2.currentStageIndex).toBe(2);
  });
});
