import { useEffect, useRef, useState } from "react";
import { STEPS } from "./data";
import { StageShell } from "./StageShell";
import { Markdown } from "../lib/markdown";
import { startLearnStream } from "../api/learnStream";
import { describeErrorCode } from "../lib/errors";

interface Props {
  concept: string;
  stepIdx: number;
  onPrev: () => void;
  onNext: () => void;
}

export function StageExplain({ concept, stepIdx, onPrev, onNext }: Props) {
  const step = STEPS[stepIdx];
  const [body, setBody] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "streaming" | "done" | "error">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string>("");
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setBody("");
    setStatus("loading");
    setErrMsg("");

    const handle = startLearnStream(
      { concept: `${concept} - ${step.title}: ${step.desc}` },
      {
        onStatus: () => setStatus("streaming"),
        onDelta: (e) => {
          setStatus("streaming");
          setBody((prev) => prev + e.text);
        },
        onComplete: (e) => {
          if (e.content) setBody(e.content);
          setStatus("done");
        },
        onError: (e) => {
          setStatus("error");
          setErrMsg(describeErrorCode(e.code, e.message));
        },
      },
    );
    abortRef.current = handle.abort;

    return () => {
      handle.abort();
      abortRef.current = null;
    };
  }, [concept, stepIdx, step.title, step.desc]);

  const retry = () => {
    abortRef.current?.();
    setBody("");
    setStatus("loading");
    setErrMsg("");
    const handle = startLearnStream(
      { concept: `${concept} - ${step.title}: ${step.desc}` },
      {
        onStatus: () => setStatus("streaming"),
        onDelta: (e) => setBody((prev) => prev + e.text),
        onComplete: (e) => {
          if (e.content) setBody(e.content);
          setStatus("done");
        },
        onError: (e) => {
          setStatus("error");
          setErrMsg(describeErrorCode(e.code, e.message));
        },
      },
    );
    abortRef.current = handle.abort;
  };

  const fallback = step.body;
  const showFallback = status === "error" && !body;

  return (
    <StageShell
      eyebrow={`03 · 개념 설명 · 개념 ${stepIdx + 1}/${STEPS.length}`}
      title={step.title}
      sub={step.desc}
      prev={onPrev}
      prevLabel={stepIdx === 0 ? "단계 다시 보기" : "이전 개념"}
      next={onNext}
      nextLabel="확인 질문 보기 →"
      nextDisabled={status === "loading"}
    >
      <article className="explain">
        {(status === "loading" || (status === "streaming" && !body)) && (
          <p className="stage-sub">설명을 불러오는 중입니다…</p>
        )}

        {body && <Markdown text={body} />}

        {showFallback && (
          <>
            <Markdown text={fallback} />
            <p className="stage-sub">샘플 설명을 임시로 보여드렸어요. 위 오류를 해결한 뒤 다시 시도해 주세요.</p>
          </>
        )}

        {status === "error" && (
          <div className="probe-result" role="alert">
            <div className="pr-head">
              <span className="pr-eyebrow">설명 불러오기 실패</span>
            </div>
            <p className="pr-reason">{errMsg}</p>
            <button className="btn-ghost" type="button" onClick={retry}>
              다시 시도
            </button>
          </div>
        )}
      </article>
    </StageShell>
  );
}
