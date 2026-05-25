import { LEVEL_LABELS } from "./data";
import { StageShell } from "./StageShell";
import { useLearnContent } from "../state/LearnContent";

interface Props {
  concept: string;
  level: number | null;
  answers: Record<string, string>;
  skips: Record<string, boolean>;
  onPrev: () => void;
  onRestart: () => void;
}

export function StageDone({ concept, level, answers, skips, onPrev, onRestart }: Props) {
  const { steps } = useLearnContent();
  const allQuestions = steps.flatMap((s) => s.questions);
  const answered = allQuestions.filter((q) => (answers[q.id] || "").trim().length > 0).length;
  const skipped = allQuestions.filter((q) => skips[q.id]).length;

  return (
    <StageShell
      eyebrow="완료"
      title={<>잘 마쳤어요</>}
      sub={`${concept} · ${steps.length}개 개념을 모두 마쳤습니다`}
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
          <span className="done-k">저장</span>
          <span className="done-v">로컬 전용 (서버 미사용)</span>
        </div>
      </div>
    </StageShell>
  );
}
