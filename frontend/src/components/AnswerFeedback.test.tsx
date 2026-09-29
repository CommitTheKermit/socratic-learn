import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { AnswerFeedback } from "./AnswerFeedback";
import { trackFirstFeedbackView } from "../lib/growthMetrics";

vi.mock("../lib/growthMetrics", () => ({ trackFirstFeedbackView: vi.fn() }));
let notify: (entries: { isIntersecting: boolean }[]) => void;
const disconnect = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof notify) { notify = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("서버 응답만으로 세지 않고 화면에 나타난 피드백을 기록한다", () => {
  render(<AnswerFeedback feedback="핵심을 설명했어요." sessionId="s1" stepIdx={2} />);
  expect(trackFirstFeedbackView).not.toHaveBeenCalled();
  notify([{ isIntersecting: false }]);
  expect(trackFirstFeedbackView).not.toHaveBeenCalled();
  notify([{ isIntersecting: true }]);
  expect(trackFirstFeedbackView).toHaveBeenCalledWith("s1", 2);
});
it("백그라운드 탭에서는 세지 않고 사용자가 돌아왔을 때 기록한다", () => {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  render(<AnswerFeedback feedback="다시 설명해 보세요." sessionId="s1" stepIdx={0} />);
  notify([{ isIntersecting: true }]);
  expect(trackFirstFeedbackView).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  document.dispatchEvent(new Event("visibilitychange"));
  expect(trackFirstFeedbackView).toHaveBeenCalledOnce();
});
it("세션 이동 시 관찰과 이벤트 구독을 해제한다", () => {
  const { unmount } = render(<AnswerFeedback feedback="피드백" sessionId="s1" stepIdx={0} />);
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
  document.dispatchEvent(new Event("visibilitychange"));
  expect(trackFirstFeedbackView).not.toHaveBeenCalled();
});
