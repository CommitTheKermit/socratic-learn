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
