import { t } from "../i18n/translate";
import { useEffect, useRef } from "react";
import { MathText } from "../lib/mathText";
import { trackFirstFeedbackView } from "../lib/growthMetrics";

export function AnswerFeedback({ feedback, sessionId, stepIdx }: {
  feedback: string; sessionId?: string; stepIdx: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !sessionId || !feedback.trim() || typeof IntersectionObserver === "undefined") return;
    let visible = false;
    const record = () => {
      if (!visible || document.visibilityState !== "visible") return;
      trackFirstFeedbackView(sessionId, stepIdx);
    };
    // API 성공을 열람으로 세지 않고 피드백이 화면에 보일 때 기록한다.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      record();
    }, { threshold: 0 });
    observer.observe(element);
    document.addEventListener("visibilitychange", record);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", record);
    };
  }, [feedback, sessionId, stepIdx]);
  return <div className="qa-feedback" ref={ref}>
    <span className="qa-feedback-label">{t("AI 피드백")}</span>
    <p><MathText text={feedback} /></p>
  </div>;
}
