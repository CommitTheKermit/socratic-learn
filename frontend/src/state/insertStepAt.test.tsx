import { describe, test, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { LearnContentProvider, useLearnContent } from "./LearnContent";
import type { ReactNode } from "react";
import type { Step } from "../stages/data";

function wrapper({ children }: { children: ReactNode }) {
  return <LearnContentProvider>{children}</LearnContentProvider>;
}

const baseStep: Step = {
  id: 99,
  title: "삽입 단계",
  desc: "분기 추천",
  body: "본문",
  questions: [{ id: "x-1", q: "?" }],
};

describe("LearnContent.insertStepAt", () => {
  test("초기 steps 가 비어 있을 때 삽입하면 길이 1, id 는 1", () => {
    const { result } = renderHook(() => useLearnContent(), { wrapper });
    let assignedId = 0;
    act(() => {
      assignedId = result.current.insertStepAt(0, baseStep);
    });
    expect(result.current.steps.length).toBe(1);
    expect(result.current.steps[0].title).toBe("삽입 단계");
    expect(assignedId).toBe(1);
    expect(result.current.steps[0].id).toBe(1);
  });

  test("같은 id 의 step 을 여러 번 삽입해도 충돌하지 않게 id 가 재할당된다", () => {
    const { result } = renderHook(() => useLearnContent(), { wrapper });
    let id1 = 0;
    let id2 = 0;
    act(() => {
      id1 = result.current.insertStepAt(0, baseStep);
    });
    act(() => {
      id2 = result.current.insertStepAt(0, baseStep);
    });
    expect(id1).not.toBe(id2);
    const ids = result.current.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("중간 삽입 시 인덱스 키 상태(stepBranches)가 +1 시프트되어 단계-상태 귀속이 유지된다", () => {
    const { result } = renderHook(() => useLearnContent(), { wrapper });
    // steps: [a, b, c]
    act(() => { result.current.insertStepAt(0, { ...baseStep, title: "a" }); });
    act(() => { result.current.insertStepAt(1, { ...baseStep, title: "b" }); });
    act(() => { result.current.insertStepAt(2, { ...baseStep, title: "c" }); });

    const cId = result.current.steps[2].id;
    const branchResult = { evaluationText: "c-branch", isMerged: false, options: [] };
    act(() => { result.current.setStepBranch(2, branchResult); });
    act(() => { result.current.markBranched(cId); });

    // 인덱스 1 앞에 삽입 → c 는 인덱스 3 으로 밀린다
    act(() => { result.current.insertStepAt(1, { ...baseStep, title: "inserted" }); });

    expect(result.current.steps.map((s) => s.title)).toEqual(["a", "inserted", "b", "c"]);
    // 분기 스냅샷 키가 2 → 3 으로 시프트되어 여전히 c 단계에 귀속
    expect(result.current.stepBranches[3]).toEqual(branchResult);
    expect(result.current.stepBranches[2]).toBeUndefined();
    // branchedStepIds 는 step.id 키라 시프트와 무관하게 c.id 유지
    expect(result.current.branchedStepIds.has(cId)).toBe(true);
  });

  test("index 가 범위를 벗어나면 양 끝으로 clamp 된다", () => {
    const { result } = renderHook(() => useLearnContent(), { wrapper });
    act(() => {
      result.current.insertStepAt(0, { ...baseStep, title: "first" });
    });
    act(() => {
      result.current.insertStepAt(999, { ...baseStep, title: "last" });
    });
    act(() => {
      result.current.insertStepAt(-1, { ...baseStep, title: "very-first" });
    });
    const titles = result.current.steps.map((s) => s.title);
    expect(titles[0]).toBe("very-first");
    expect(titles[titles.length - 1]).toBe("last");
  });
});
