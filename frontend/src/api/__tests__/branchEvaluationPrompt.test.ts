import { describe, it, expect } from "vitest";
import {
  buildBranchEvaluationPrompt,
  BRANCH_EVALUATION_SYSTEM,
} from "../prompts";

describe("buildBranchEvaluationPrompt", () => {
  const params = {
    concept: "코루틴",
    level: 2,
    stepTitle: "중단/재개",
    stepDesc: "스레드 대신 함수가 멈춘다",
    stepBody: "suspend/resume 으로 작성한다.",
    qaText: "Q1: ...\nA1: ...",
    roadmapOutlineText: "1. 동기 비용\n2. 중단/재개\n3. 정의",
  };

  it("returns a system+user pair backed by the branch evaluation system prompt", () => {
    const { system, user } = buildBranchEvaluationPrompt(params);
    expect(system).toBe(BRANCH_EVALUATION_SYSTEM);
    expect(typeof user).toBe("string");
    expect(user.length).toBeGreaterThan(0);
  });

  it("system prompt requires single JSON with evaluationText, isMerged, branchOptions", () => {
    const { system } = buildBranchEvaluationPrompt(params);
    expect(system).toContain("evaluationText");
    expect(system).toContain("isMerged");
    expect(system).toContain("branchOptions");
    expect(system).toMatch(/단일 JSON/);
  });

  it("user message embeds concept, level, step, roadmap, and qa context", () => {
    const { user } = buildBranchEvaluationPrompt(params);
    expect(user).toContain("코루틴");
    expect(user).toContain("L2");
    expect(user).toContain("중단/재개");
    expect(user).toContain("1. 동기 비용");
    expect(user).toContain("Q1:");
    expect(user).toContain("evaluationText");
    expect(user).toContain("isMerged");
    expect(user).toContain("branchOptions");
  });
});
