/**
 * 슬라이스 3 - 콘텐츠 생성 SYSTEM 프롬프트에 조건부 LaTeX 수식 출력 지시가 포함되는지 검증.
 *
 * 프론트(frontend/src/lib/mathSegments.ts)가 $...$ / $$...$$ 델리미터를 KaTeX 로 렌더하므로,
 * 백엔드 프롬프트가 수식을 그 델리미터로 조건부 출력하도록 지시해야 end-to-end 로 동작한다.
 * 여기서는 프롬프트 문자열에 지시가 박혀 있는지(소스 of truth)만 단위 검증한다.
 */
import { describe, it, expect } from "vitest";
import {
  MATH_DIRECTIVE,
  PROBE_SYSTEM,
  STEP_DETAIL_SYSTEM,
  STEP_DETAIL_STREAM_SYSTEM,
  EVAL_SYSTEM,
  BRANCH_EVALUATION_SYSTEM,
} from "../prompts";

describe("MATH_DIRECTIVE", () => {
  it("인라인 $...$ 와 블록 $$...$$ 델리미터를 모두 지시한다", () => {
    expect(MATH_DIRECTIVE).toContain("$...$");
    expect(MATH_DIRECTIVE).toContain("$$...$$");
  });

  it("조건부 출력(필요할 때만) 지시를 포함한다", () => {
    expect(MATH_DIRECTIVE).toContain("필요할 때만");
    expect(MATH_DIRECTIVE).toContain("필요 없는");
  });
});

describe("콘텐츠 생성 SYSTEM 프롬프트", () => {
  const surfaces: Array<[string, string]> = [
    ["PROBE_SYSTEM", PROBE_SYSTEM],
    ["STEP_DETAIL_SYSTEM", STEP_DETAIL_SYSTEM],
    ["STEP_DETAIL_STREAM_SYSTEM", STEP_DETAIL_STREAM_SYSTEM],
    ["EVAL_SYSTEM", EVAL_SYSTEM],
    ["BRANCH_EVALUATION_SYSTEM", BRANCH_EVALUATION_SYSTEM],
  ];

  it.each(surfaces)("%s 에 수식 표기 디렉티브가 포함된다", (_name, system) => {
    expect(system).toContain(MATH_DIRECTIVE);
    expect(system).toContain("[수식 표기]");
    expect(system).toContain("$...$");
    expect(system).toContain("$$...$$");
  });
});
