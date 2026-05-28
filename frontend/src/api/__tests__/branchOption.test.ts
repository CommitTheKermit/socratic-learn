import { describe, it, expect } from "vitest";
import type { BranchOption, BranchOptionType } from "../contract";

describe("BranchOption type contract", () => {
  it("accepts all four type variants with required fields", () => {
    const types: BranchOptionType[] = [
      "roadmap_next",
      "ai_recommended",
      "additional",
      "exit",
    ];

    const samples: BranchOption[] = types.map((t) => ({
      label: `option-${t}`,
      type: t,
      isRecommended: t === "ai_recommended",
      stageContent:
        t === "exit"
          ? null
          : {
              id: 1,
              title: "t",
              desc: "d",
              body: "b",
              questions: [],
            },
    }));

    expect(samples).toHaveLength(4);
    expect(samples.map((s) => s.type)).toEqual(types);
    expect(samples[1].isRecommended).toBe(true);
    expect(samples[3].stageContent).toBeNull();
    expect(samples[0].stageContent?.id).toBe(1);
    expect(typeof samples[0].label).toBe("string");
    expect(typeof samples[0].isRecommended).toBe("boolean");
  });
});
