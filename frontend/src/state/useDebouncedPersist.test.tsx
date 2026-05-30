import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDebouncedPersist } from "./useDebouncedPersist";
import type { SessionState } from "./sessionState";

function snap(partial: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: "s",
    createdAt: 1,
    conceptSummary: "",
    stage: "input",
    depth: "0depth",
    concept: "",
    materials: "",
    probes: {},
    estimatedLevel: null,
    stepIdx: 0,
    answers: {},
    skips: {},
    explainStreamComplete: false,
    ...partial,
  };
}

describe("useDebouncedPersist", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("trigger 변경 후 delayMs 전엔 persist 가 호출되지 않고, 경과 후 1회 호출된다", () => {
    const persist = vi.fn();
    const { rerender } = renderHook(
      ({ t }) =>
        useDebouncedPersist(t, () => snap({ answers: { q1: String(t) } }), persist, 500),
      { initialProps: { t: 0 } },
    );

    // 마운트 시에도 effect 가 발화하므로 첫 호출도 디바운스를 거친다.
    expect(persist).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(persist).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(persist).toHaveBeenCalledTimes(1);

    // 후속 변경도 동일하게 디바운스
    rerender({ t: 1 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1][0].answers).toEqual({ q1: "1" });
  });

  test("delayMs 내 연속 변경은 마지막 1회만 persist 된다", () => {
    const persist = vi.fn();
    const { rerender } = renderHook(
      ({ t }) =>
        useDebouncedPersist(t, () => snap({ answers: { q1: String(t) } }), persist, 500),
      { initialProps: { t: 0 } },
    );

    rerender({ t: 1 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ t: 2 });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ t: 3 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0].answers).toEqual({ q1: "3" });
  });

  test("cancelPending 호출 후 타이머가 경과해도 persist 가 호출되지 않는다", () => {
    const persist = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedPersist("a", () => snap(), persist, 500),
    );

    act(() => {
      result.current.cancelPending();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(persist).not.toHaveBeenCalled();
  });

  test("언마운트 시 pending 이 있으면 flush 된다", () => {
    const persist = vi.fn();
    const { unmount } = renderHook(
      ({ t }) => useDebouncedPersist(t, () => snap({ answers: { q1: String(t) } }), persist, 500),
      { initialProps: { t: 7 } },
    );

    // 타이머 만료 전에 언마운트
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(persist).not.toHaveBeenCalled();

    unmount();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0].answers).toEqual({ q1: "7" });
  });

  test("cancelPending 후 언마운트 시 flush 되지 않는다", () => {
    const persist = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDebouncedPersist("a", () => snap(), persist, 500),
    );

    act(() => {
      result.current.cancelPending();
    });
    unmount();
    expect(persist).not.toHaveBeenCalled();
  });
});
