import { describe, it, expect } from "vitest";
import { parseEvaluationJson } from "../answers";
import type { EvaluationResponse } from "../contract";

describe("parseEvaluationJson - valid JSON input", () => {
  const validPayload = {
    evaluationText: "핵심 메커니즘을 정확히 짚었습니다.",
    isMerged: false,
    branchOptions: [
      {
        label: "다음 단계로",
        type: "roadmap_next",
        isRecommended: false,
        stageContent: { id: 2, title: "t", desc: "d", body: "b", questions: [] },
      },
      {
        label: "추천 분기",
        type: "ai_recommended",
        isRecommended: true,
        stageContent: { id: 3, title: "t2", desc: "d2", body: "b2", questions: [] },
      },
      {
        label: "종료",
        type: "exit",
        isRecommended: false,
        stageContent: null,
      },
    ],
  };

  it("returns EvaluationResponse with evaluationText/isMerged/branchOptions for a valid object", () => {
    const result = parseEvaluationJson(validPayload);
    expect("parseError" in result).toBe(false);
    const ok = result as EvaluationResponse;
    expect(ok.evaluationText).toBe(validPayload.evaluationText);
    expect(ok.isMerged).toBe(false);
    expect(ok.branchOptions).toHaveLength(3);
    expect(ok.branchOptions[1].isRecommended).toBe(true);
    expect(ok.branchOptions[2].stageContent).toBeNull();
  });

  it("accepts a JSON string and returns the same EvaluationResponse fields", () => {
    const result = parseEvaluationJson(JSON.stringify(validPayload));
    expect("parseError" in result).toBe(false);
    const ok = result as EvaluationResponse;
    expect(ok.evaluationText).toBe(validPayload.evaluationText);
    expect(ok.isMerged).toBe(false);
    expect(ok.branchOptions.map((b) => b.type)).toEqual([
      "roadmap_next",
      "ai_recommended",
      "exit",
    ]);
  });

  it("does not throw and returns parseError for invalid JSON string", () => {
    let threw = false;
    let result: ReturnType<typeof parseEvaluationJson> | undefined;
    try {
      result = parseEvaluationJson("{not json");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
  });
});

describe("parseEvaluationJson - schema violations return parseError without throwing", () => {
  const callSafely = (
    input: unknown,
  ): { threw: boolean; result?: ReturnType<typeof parseEvaluationJson> } => {
    try {
      return { threw: false, result: parseEvaluationJson(input as never) };
    } catch {
      return { threw: true };
    }
  };

  it("returns parseError when root is not an object (null)", () => {
    const { threw, result } = callSafely(null);
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
  });

  it("returns parseError when root is an array", () => {
    const { threw, result } = callSafely([]);
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
    if (result && "parseError" in result) {
      expect(typeof result.parseError).toBe("string");
    }
  });

  it("returns parseError when evaluationText is missing", () => {
    const { threw, result } = callSafely({ isMerged: false, branchOptions: [] });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
    if (result && "parseError" in result) {
      expect(result.parseError).toMatch(/evaluationText/);
    }
  });

  it("returns parseError when evaluationText has wrong type", () => {
    const { threw, result } = callSafely({
      evaluationText: 123,
      isMerged: false,
      branchOptions: [],
    });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
    if (result && "parseError" in result) {
      expect(result.parseError).toMatch(/evaluationText/);
    }
  });

  it("returns parseError when isMerged is missing or wrong type", () => {
    const { threw, result } = callSafely({
      evaluationText: "ok",
      isMerged: "no",
      branchOptions: [],
    });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
    if (result && "parseError" in result) {
      expect(result.parseError).toMatch(/isMerged/);
    }
  });

  it("returns parseError when branchOptions is not an array", () => {
    const { threw, result } = callSafely({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: "nope",
    });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
    if (result && "parseError" in result) {
      expect(result.parseError).toMatch(/branchOptions/);
    }
  });

  it("returns parseError when a branchOption has unknown type", () => {
    const { threw, result } = callSafely({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: [
        {
          label: "x",
          type: "definitely_not_a_type",
          isRecommended: false,
          stageContent: null,
        },
      ],
    });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
    if (result && "parseError" in result) {
      expect(result.parseError).toMatch(/branchOptions\[0\]/);
    }
  });

  it("returns parseError when a branchOption is missing fields", () => {
    const { threw, result } = callSafely({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: [{ label: "x", type: "exit" }],
    });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
  });

  it("returns parseError when a branchOption.stageContent has wrong type", () => {
    const { threw, result } = callSafely({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: [
        { label: "x", type: "exit", isRecommended: false, stageContent: "not-an-object" },
      ],
    });
    expect(threw).toBe(false);
    expect(result && "parseError" in result).toBe(true);
  });

  it("does not throw for primitive / undefined / function inputs", () => {
    const inputs: unknown[] = [undefined, 42, true, () => 0, Symbol("s")];
    for (const inp of inputs) {
      const { threw, result } = callSafely(inp);
      expect(threw).toBe(false);
      expect(result && "parseError" in result).toBe(true);
    }
  });
});
