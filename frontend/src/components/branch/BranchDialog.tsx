import { useEffect, useRef } from "react";
import type { BranchOption } from "../../api/contract";
import { MathText } from "../../lib/mathText";
import "./branch.css";

interface BranchDialogProps {
  open: boolean;
  evaluationText: string;
  options: BranchOption[];
  onChoose: (option: BranchOption) => void;
  onClose: () => void;
  error?: BranchErrorPayload | null;
}

export interface BranchErrorPayload {
  message: string;
  retryCount: number;
  technicalDetail?: string;
  onRetry: () => void;
  onExit: () => void;
}

const TYPE_PREVIEW_EXIT = "여기까지의 학습을 정리하고 마치기";

function IconArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" />
      <path d="m6 6 2.5 2.5" /><path d="m15.5 15.5 2.5 2.5" />
      <path d="m18 6-2.5 2.5" /><path d="m8.5 15.5-6 6" />
    </svg>
  );
}
function IconDot() {
  return <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>;
}
function IconExit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6h11v12H9" /><path d="m13 9 3 3-3 3" /><path d="M4 12h12" />
    </svg>
  );
}
function IconChev() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 6 18 18" /><path d="M18 6 6 18" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3 2 20h20Z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconRetry() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
    </svg>
  );
}

function iconFor(type: BranchOption["type"]) {
  switch (type) {
    case "roadmap_next":
      return <IconArrow />;
    case "ai_recommended":
      return <IconSpark />;
    case "additional":
      return <IconDot />;
    case "exit":
      return <IconExit />;
  }
}

function previewOf(option: BranchOption): string {
  if (option.type === "exit" || !option.stageContent) return TYPE_PREVIEW_EXIT;
  return `${option.stageContent.title} · ${option.stageContent.desc}`;
}

export function BranchDialog({ open, evaluationText, options, onChoose, onClose, error }: BranchDialogProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="bd-backdrop" aria-hidden onClick={onClose} />
      <div className="bd-frame" role="dialog" aria-modal="true" aria-labelledby="bd-title">
        <div className="bd-surface" ref={surfaceRef}>
          {error ? (
            <ErrorMode error={error} onClose={onClose} />
          ) : (
            <ChooseMode
              evaluationText={evaluationText}
              options={options}
              onChoose={onChoose}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>
  );
}

function ChooseMode({
  evaluationText,
  options,
  onChoose,
  onClose,
}: {
  evaluationText: string;
  options: BranchOption[];
  onChoose: (option: BranchOption) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="bd-head">
        <div>
          <div className="bd-eyebrow">평가 완료 · 다음 분기 선택</div>
          <h3 className="bd-title" id="bd-title">다음으로 어디로 가볼까요?</h3>
          <p className="bd-sub">방금 답변을 평가했어요. 알맞은 길을 골라주세요.</p>
        </div>
        <button className="bd-close" type="button" aria-label="닫기" onClick={onClose}>
          <IconClose />
        </button>
      </div>
      <div className="bd-body">
        <div className="bd-eval">
          <div className="bd-eval-eyebrow">평가 결과</div>
          <p className="bd-eval-body"><MathText text={evaluationText} /></p>
        </div>
        <div className="bd-section-head">
          <span className="h">다음 학습 분기</span>
          <span className="meta">{options.length}개 옵션</span>
        </div>
        <div className="bd-list">
          {options.map((opt, i) => {
            const isExit = opt.type === "exit";
            return (
              <button
                key={`${opt.type}-${i}`}
                className={
                  "bd-card" +
                  (opt.isRecommended ? " is-rec" : "") +
                  (isExit ? " is-exit" : "")
                }
                type="button"
                onClick={() => onChoose(opt)}
              >
                <span className={"bd-icon" + (opt.isRecommended ? " is-holo" : "")}>
                  {iconFor(opt.type)}
                </span>
                <span className="bd-body-col">
                  <span className="bd-label">
                    {opt.label}
                    {opt.isRecommended && <span className="bd-rec">추천</span>}
                  </span>
                  <span className="bd-preview">{previewOf(opt)}</span>
                </span>
                <span className="bd-chev"><IconChev /></span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ErrorMode({ error, onClose }: { error: BranchErrorPayload; onClose: () => void }) {
  return (
    <>
      <div className="bd-head">
        <div>
          <div className="bd-eyebrow">분기 선택 · 오류</div>
          <h3 className="bd-title" id="bd-title">다시 한 번 시도해볼까요?</h3>
          <p className="bd-sub">LLM 응답을 분기 형식으로 받지 못했습니다</p>
        </div>
        <button className="bd-close" type="button" aria-label="닫기" onClick={onClose}>
          <IconClose />
        </button>
      </div>
      <div className="bd-body">
        <div className="bd-err-card">
          <div className="bd-err-head">
            <span className="bd-err-icon"><IconAlert /></span>
            <div className="bd-err-headtxt">
              <div className="bd-err-title">분기 옵션을 만들지 못했어요</div>
              <div className="bd-err-retries">재시도 {error.retryCount}회</div>
            </div>
          </div>
          <p className="bd-err-msg">{error.message}</p>
          {error.technicalDetail && (
            <details className="bd-err-details">
              <summary>기술적 상세 보기</summary>
              <pre>{error.technicalDetail}</pre>
            </details>
          )}
          <div className="bd-err-actions">
            <button className="bd-btn-ghost" type="button" onClick={error.onExit}>학습 종료</button>
            <button className="bd-btn-primary" type="button" onClick={error.onRetry}>
              <IconRetry /> 다시 시도
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
