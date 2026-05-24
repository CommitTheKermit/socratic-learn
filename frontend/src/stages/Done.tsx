import { useEffect, useState } from "react";
import { LEVEL_LABELS, STEPS } from "./data";
import { StageShell } from "./StageShell";
import { submitAnswers, AnswersSubmissionError } from "../api/answers";
import { describeErrorCode } from "../lib/errors";
import type { AnswerItem } from "../api/contract";

interface Props {
  concept: string;
  level: number | null;
  answers: Record<string, string>;
  skips: Record<string, boolean>;
  onPrev: () => void;
  onRestart: () => void;
}

export function StageDone({ concept, level, answers, skips, onPrev, onRestart }: Props) {
  const allQuestions = STEPS.flatMap((s) => s.questions);
  const answered = allQuestions.filter((q) => (answers[q.id] || "").trim().length > 0).length;
  const skipped = allQuestions.filter((q) => skips[q.id]).length;

  const [submitState, setSubmitState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [submitMsg, setSubmitMsg] = useState<string>("");
  const [receivedCount, setReceivedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const items: AnswerItem[] = allQuestions
      .map((q) => {
        const ans = (answers[q.id] || "").trim();
        const unknown = !!skips[q.id];
        if (!ans && !unknown) return null;
        return {
          questionId: q.id,
          question: q.q,
          answer: ans || undefined,
          unknown,
        } as AnswerItem;
      })
      .filter((x): x is AnswerItem => x !== null);

    if (!items.length) {
      setSubmitState("idle");
      return;
    }

    setSubmitState("loading");
    submitAnswers({ concept, answers: items })
      .then((res) => {
        if (cancelled) return;
        setSubmitState("ok");
        setSubmitMsg(res.message);
        setReceivedCount(res.receivedCount);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSubmitState("error");
        if (e instanceof AnswersSubmissionError) {
          setSubmitMsg(describeErrorCode(e.code, e.message));
        } else {
          setSubmitMsg((e as Error)?.message ?? "답변 제출 실패");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StageShell
      eyebrow="완료"
      title={<>잘 마쳤어요</>}
      sub={`${concept} · ${STEPS.length}개 개념을 모두 마쳤습니다`}
      prev={onPrev}
      prevLabel="마지막 답변 다시 보기"
      next={onRestart}
      nextLabel="새 개념 시작 →"
    >
      <div className="done-card">
        <div className="done-row">
          <span className="done-k">시작 수준</span>
          <span className="done-v">
            L{level ?? "-"} · {LEVEL_LABELS[level ?? 2]}
          </span>
        </div>
        <div className="done-row">
          <span className="done-k">답변</span>
          <span className="done-v">
            {answered} / {allQuestions.length} 문항
          </span>
        </div>
        <div className="done-row">
          <span className="done-k">모르겠어요</span>
          <span className="done-v">{skipped} 문항 · 다음 학습에서 다시 만나요</span>
        </div>
        <div className="done-row">
          <span className="done-k">서버 전송</span>
          <span className="done-v">
            {submitState === "loading" && "전송 중…"}
            {submitState === "ok" &&
              `${receivedCount ?? 0}건 수신 · ${submitMsg || "성공"}`}
            {submitState === "error" && `실패 · ${submitMsg}`}
            {submitState === "idle" && "전송할 답변이 없어요"}
          </span>
        </div>
      </div>
    </StageShell>
  );
}
