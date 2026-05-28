import { describe, test, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { BranchOption, EvaluationResponse, ParseFailure } from "../api/contract";
import type { Step } from "../stages/data";
import type { BranchState } from "./branchReducer";

const generateBranchEvaluationMock = vi.fn<
  (...args: unknown[]) => Promise<EvaluationResponse | ParseFailure>
>();

vi.mock("../api/claudeContent", async () => {
  const actual = await vi.importActual<typeof import("../api/claudeContent")>(
    "../api/claudeContent",
  );
  return {
    ...actual,
    generateBranchEvaluation: (...args: unknown[]) =>
      generateBranchEvaluationMock(...args),
  };
});

import { useBranchPhase } from "./useBranchPhase";

const sampleStep: Step = {
  id: 2,
  title: "스레드 비용",
  desc: "왜 더 가벼운 단위가 필요할까",
  body: "본문",
  questions: [{ id: "2-1", q: "스레드 메모리는?" }],
};

const sampleInput = {
  concept: "코루틴",
  level: 2,
  step: sampleStep,
  questions: [{ id: "2-1", q: "스레드 메모리는?", answer: "1MB" }],
  roadmapOutlineText: "01 동시성\n02 스레드 비용\n03 일시중단",
};

const sampleOptions: BranchOption[] = [
  {
    label: "다음 로드맵 - 일시중단 함수",
    type: "roadmap_next",
    isRecommended: true,
    stageContent: { id: 3, title: "일시중단 함수", desc: "suspend", body: "", questions: [] },
  },
  {
    label: "여기서 학습을 마치기",
    type: "exit",
    isRecommended: false,
    stageContent: null,
  },
];

beforeEach(() => {
  generateBranchEvaluationMock.mockReset();
});

describe("useBranchPhase - 성공 경로", () => {
  test("openBranch 성공 시 mode=choosing 으로 전이하고 옵션과 평가 텍스트를 노출", async () => {
    generateBranchEvaluationMock.mockResolvedValueOnce({
      evaluationText: "부분 정답",
      isMerged: true,
      branchOptions: sampleOptions,
    });
    const { result } = renderHook(() => useBranchPhase());
    expect(result.current.mode).toBe("closed");

    await act(async () => {
      await result.current.openBranch(sampleInput);
    });

    expect(result.current.mode).toBe("choosing");
    expect(result.current.evaluationText).toBe("부분 정답");
    expect(result.current.options).toEqual(sampleOptions);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe("useBranchPhase - 파싱 실패 경로", () => {
  test("ParseFailure 응답이면 mode=error 로 전이하고 technicalDetail 에 parseError 가 들어간다", async () => {
    generateBranchEvaluationMock.mockResolvedValueOnce({ parseError: "missing branchOptions" });
    const { result } = renderHook(() => useBranchPhase());

    await act(async () => {
      await result.current.openBranch(sampleInput);
    });

    expect(result.current.mode).toBe("error");
    expect(result.current.technicalDetail).toBe("missing branchOptions");
    expect(result.current.options).toEqual([]);
    expect(result.current.errorMessage).toMatch(/해석하지 못/);
  });
});

describe("useBranchPhase - 네트워크/예외 경로", () => {
  test("generateBranchEvaluation 이 throw 하면 mode=error 로 전이하고 사용자 메시지 표시", async () => {
    generateBranchEvaluationMock.mockRejectedValueOnce(new Error("network down"));
    const { result } = renderHook(() => useBranchPhase());

    await act(async () => {
      await result.current.openBranch(sampleInput);
    });

    expect(result.current.mode).toBe("error");
    expect(result.current.errorMessage).toMatch(/잠시 후 다시/);
    expect(result.current.technicalDetail).toContain("network down");
  });
});

describe("useBranchPhase - 재시도", () => {
  test("retryBranch 호출은 retryCount 를 1 증가시키고 다시 호출한다", async () => {
    generateBranchEvaluationMock.mockResolvedValueOnce({ parseError: "x" });
    const { result } = renderHook(() => useBranchPhase());

    await act(async () => {
      await result.current.openBranch(sampleInput);
    });
    expect(result.current.retryCount).toBe(0);

    generateBranchEvaluationMock.mockResolvedValueOnce({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: sampleOptions,
    });
    await act(async () => {
      await result.current.retryBranch(sampleInput);
    });

    expect(result.current.retryCount).toBe(1);
    expect(result.current.mode).toBe("choosing");
    expect(generateBranchEvaluationMock).toHaveBeenCalledTimes(2);
  });
});

describe("useBranchPhase - chooseBranch", () => {
  test("선택한 옵션을 reducer 에 위임해 새 BranchState 를 반환하고 다이얼로그를 닫는다", async () => {
    generateBranchEvaluationMock.mockResolvedValueOnce({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: sampleOptions,
    });
    const { result } = renderHook(() => useBranchPhase());
    await act(async () => {
      await result.current.openBranch(sampleInput);
    });
    expect(result.current.mode).toBe("choosing");

    const baseState: BranchState = {
      roadmapStages: [sampleStep],
      currentStageIndex: 0,
      stage: "explain",
    };

    let next: BranchState | undefined;
    act(() => {
      next = result.current.chooseBranch(sampleOptions[1] /* exit */, baseState);
    });
    expect(next?.stage).toBe("done");
    expect(result.current.mode).toBe("closed");
  });
});

describe("useBranchPhase - closeBranch", () => {
  test("closeBranch 는 스냅샷을 초기화한다", async () => {
    generateBranchEvaluationMock.mockResolvedValueOnce({
      evaluationText: "ok",
      isMerged: false,
      branchOptions: sampleOptions,
    });
    const { result } = renderHook(() => useBranchPhase());
    await act(async () => {
      await result.current.openBranch(sampleInput);
    });
    expect(result.current.mode).toBe("choosing");

    act(() => result.current.closeBranch());

    expect(result.current.mode).toBe("closed");
    expect(result.current.options).toEqual([]);
    expect(result.current.evaluationText).toBe("");
  });
});
