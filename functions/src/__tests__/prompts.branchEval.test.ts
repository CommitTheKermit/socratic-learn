/**
 * branchEval 프롬프트 isMerged 정의 검증.
 *
 * AC: isMerged 정의가 "바로 다음 단계"에서 "전체 로드맵 어느 단계와도"로 확장되어야 한다.
 * 전체 로드맵(title+desc)은 이미 branchEvaluationUserMessage 에 주입되므로 데이터 배선은 없다.
 */
import { describe, it, expect } from "vitest";
import {
  BRANCH_EVALUATION_SYSTEM,
  branchEvaluationUserMessage,
  buildBranchEvaluationPrompt,
} from "../prompts";

describe("BRANCH_EVALUATION_SYSTEM - isMerged 정의", () => {
  it("전체 로드맵 어느 단계와도 비교하도록 지시한다", () => {
    expect(BRANCH_EVALUATION_SYSTEM).toContain("전체 로드맵");
    expect(BRANCH_EVALUATION_SYSTEM).toContain("어느 단계와도");
  });

  it("아직 학습하지 않은 단계를 비교 대상에 포함한다고 명시한다", () => {
    expect(BRANCH_EVALUATION_SYSTEM).toContain("아직 학습하지 않은");
  });

  it('"바로 다음 단계"만으로 한정하지 않는다', () => {
    // 구 정의의 핵심 한정 문구가 isMerged 줄에 단독 정의로 남아있지 않아야 한다.
    // 새 정의에서는 "바로 다음 단계뿐 아니라"로 포함하되 확장 의미를 갖는다.
    const isMergedLine = BRANCH_EVALUATION_SYSTEM
      .split("\n")
      .find((line) => line.includes("isMerged:"));
    expect(isMergedLine).toBeDefined();
    // 구 정의("바로 다음 단계와 실질적으로 동일하면 true"만)로 끝나지 않는다.
    expect(isMergedLine).not.toMatch(/바로 다음 단계와 실질적으로 동일하면 true\.$/);
  });

  it("실질적 동일의 의미를 설명한다", () => {
    expect(BRANCH_EVALUATION_SYSTEM).toContain("실질적 동일");
    expect(BRANCH_EVALUATION_SYSTEM).toContain("같은 개념");
  });
});

describe("branchEvaluationUserMessage - 전체 로드맵 주입", () => {
  const baseParams = {
    concept: "코루틴",
    level: 1,
    stepTitle: "중단/재개의 아이디어",
    stepDesc: "함수가 멈췄다가 재개되는 모델",
    stepBody: "코루틴은 중단(suspend)과 재개(resume)로 동작합니다.",
    qaText: "- id: 3-1\n  질문: 중단과 재개란?\n  사용자 답변: 함수를 멈추는 것",
    roadmapOutlineText:
      "1. 동기/블로킹의 비용\n2. 비동기 콜백의 한계\n3. 중단/재개의 아이디어\n4. 코루틴의 정의",
  };

  it("user message 에 전체 로드맵이 포함된다", () => {
    const msg = branchEvaluationUserMessage(baseParams);
    expect(msg).toContain("전체 로드맵:");
    expect(msg).toContain(baseParams.roadmapOutlineText);
  });

  it("buildBranchEvaluationPrompt 의 user 에도 전체 로드맵이 담긴다", () => {
    const { user } = buildBranchEvaluationPrompt(baseParams);
    expect(user).toContain(baseParams.roadmapOutlineText);
  });
});
