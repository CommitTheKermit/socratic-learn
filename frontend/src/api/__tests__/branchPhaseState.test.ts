import { describe, it, expect } from "vitest";
import type { BranchPhaseState, BranchPhaseStage } from "../contract";

describe("BranchPhaseState type contract", () => {
  it("includes stage, parseError, retryCount, lastErrorMessage fields", () => {
    const initial: BranchPhaseState = {
      stage: "idle",
      parseError: false,
      retryCount: 0,
      lastErrorMessage: null,
    };

    expect(initial.stage).toBe("idle");
    expect(initial.parseError).toBe(false);
    expect(initial.retryCount).toBe(0);
    expect(initial.lastErrorMessage).toBeNull();
  });

  it("supports all stage variants and error fields", () => {
    const stages: BranchPhaseStage[] = [
      "idle",
      "evaluating",
      "awaiting_choice",
      "merged",
      "error",
    ];

    const errored: BranchPhaseState = {
      stage: "error",
      parseError: true,
      retryCount: 2,
      lastErrorMessage: "invalid json",
    };

    expect(stages).toHaveLength(5);
    expect(errored.parseError).toBe(true);
    expect(errored.retryCount).toBe(2);
    expect(errored.lastErrorMessage).toBe("invalid json");
    expect(typeof errored.retryCount).toBe("number");
    expect(typeof errored.parseError).toBe("boolean");
  });
});
