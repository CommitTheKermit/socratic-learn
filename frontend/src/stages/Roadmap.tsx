import { LEVEL_LABELS, STEPS } from "./data";
import { StageShell } from "./StageShell";

interface Props {
  concept: string;
  level: number | null;
  onPrev: () => void;
  onNext: () => void;
}

export function StageRoadmap({ concept, level, onPrev, onNext }: Props) {
  const safeLevel = level ?? 2;
  return (
    <StageShell
      eyebrow="02 · 단계 제시"
      title={<>{concept}, 이렇게 풀어드릴게요</>}
      sub={`${LEVEL_LABELS[safeLevel]} 기준 · ${STEPS.length}개 개념 · 각 개념마다 짧은 확인 질문`}
      prev={onPrev}
      prevLabel="수준 확인 다시 보기"
      next={onNext}
      nextLabel="첫 개념 시작 →"
    >
      <ol className="roadmap-list">
        {STEPS.map((step, i) => (
          <li key={step.id} className="roadmap-row">
            <span className="rm-num">{String(i + 1).padStart(2, "0")}</span>
            <span className="rm-body">
              <span className="rm-title">{step.title}</span>
              <span className="rm-desc">{step.desc}</span>
            </span>
            <span className="rm-meta">{step.questions.length}문항</span>
          </li>
        ))}
      </ol>
    </StageShell>
  );
}
