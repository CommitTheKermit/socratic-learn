import { describe, test, expect } from "vitest";
import { reduceBranch, type BranchState } from "./branchReducer";
import type { Step } from "../stages/data";

const stages: Step[] = [
  { id: 1, title: "a", desc: "", body: "", questions: [] },
  { id: 2, title: "b", desc: "", body: "", questions: [] },
  { id: 3, title: "c", desc: "", body: "", questions: [] },
];

const inserted: Step = { id: 99, title: "추천 단계", desc: "", body: "", questions: [] };

describe("reduceBranch - ai_recommended / additional splice 삽입", () => {
  const base: BranchState = {
    roadmapStages: stages,
    currentStageIndex: 0,
    stage: "explain",
  };

  test("ai_recommended 는 currentStageIndex+1 위치에 splice 로 삽입한다", () => {
    const next = reduceBranch(base, { type: "ai_recommended", stageContent: inserted });
    expect(next.roadmapStages.map((s) => s.id)).toEqual([1, 99, 2, 3]);
  });

  test("additional 도 동일 규칙으로 삽입한다", () => {
    const next = reduceBranch(base, { type: "additional", stageContent: inserted });
    expect(next.roadmapStages.map((s) => s.id)).toEqual([1, 99, 2, 3]);
  });

  test("기존 단계 순서는 보존된다 (제거/재정렬 없음)", () => {
    const next = reduceBranch(base, { type: "ai_recommended", stageContent: inserted });
    const existingIds = next.roadmapStages
      .filter((s) => s.id !== inserted.id)
      .map((s) => s.id);
    expect(existingIds).toEqual([1, 2, 3]);
  });

  test("stageContent 가 없으면 상태는 변하지 않는다", () => {
    const next = reduceBranch(base, { type: "ai_recommended" });
    expect(next).toBe(base);
  });
});

describe("reduceBranch - 자동 done 전이", () => {
  test("roadmap_next 결과로 인덱스가 길이를 초과하면 stage=done", () => {
    const state: BranchState = {
      roadmapStages: stages,
      currentStageIndex: 2,
      stage: "explain",
    };
    const next = reduceBranch(state, { type: "roadmap_next" });
    expect(next.currentStageIndex).toBe(3);
    expect(next.stage).toBe("done");
  });

  test("아직 마지막이 아니면 done 으로 전이되지 않는다", () => {
    const state: BranchState = {
      roadmapStages: stages,
      currentStageIndex: 0,
      stage: "explain",
    };
    const next = reduceBranch(state, { type: "roadmap_next" });
    expect(next.stage).toBe("explain");
  });
});
