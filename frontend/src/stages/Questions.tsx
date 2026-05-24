import { STEPS } from "./data";
import { StageShell } from "./StageShell";

interface Props {
  stepIdx: number;
  onPrev: () => void;
  onNext: () => void;
}

export function StageQuestions({ stepIdx, onPrev, onNext }: Props) {
  const step = STEPS[stepIdx];
  return (
    <StageShell
      eyebrow={`04 · 확인 질문 · 개념 ${stepIdx + 1}/${STEPS.length}`}
      title={<>{step.title}, 이해 확인할게요</>}
      sub={`${step.questions.length}개 질문 · 한 문장이면 충분해요`}
      prev={onPrev}
      prevLabel="설명 다시 보기"
      next={onNext}
      nextLabel="답변 시작 →"
    >
      <ol className="q-preview">
        {step.questions.map((q, i) => (
          <li key={q.id}>
            <span className="qn">Q{i + 1}</span>
            <span className="qt">
              <span className="qq">{q.q}</span>
              <span className="qh">힌트 - {q.hint}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="q-tip">
        모르면 <b>모르겠어요</b>를 눌러도 괜찮아요. 그 질문은 다음 학습에서 다시 만나게 됩니다.
      </p>
    </StageShell>
  );
}
