import { useState } from "react";
import { I } from "./icons";
import { STAGE_LABELS, type Stage } from "../stages/data";

interface Props {
  stage: Stage;
  concept: string;
  onNewSession: () => void;
  onToggleCollapse: () => void;
}

export function Sidebar({ stage, concept, onNewSession, onToggleCollapse }: Props) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const isActive = stage !== "input";

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="sb-brand-mark">{I.brand}</span>
        <span className="sb-brand-name">Socratic</span>
        <button
          className="sb-collapse"
          aria-label="사이드바 접기"
          onClick={onToggleCollapse}
          type="button"
        >
          {I.sidebar}
        </button>
      </div>

      <button
        className={"sb-item is-primary" + (stage === "input" ? " is-active" : "")}
        type="button"
        onClick={onNewSession}
      >
        <span className="ico">{I.capture}</span>
        새로 학습하기
      </button>
      <button className="sb-item" type="button">
        <span className="ico">{I.archive}</span>
        아카이브
      </button>
      <button className="sb-item" type="button">
        <span className="ico">{I.folder}</span>
        폴더
      </button>

      <div className="sb-divider" />

      <button
        className="sb-section"
        aria-expanded={historyOpen}
        onClick={() => setHistoryOpen((v) => !v)}
        type="button"
      >
        <span className="ico">{I.history}</span>
        학습 히스토리
        <span className="chev">{I.chevSmall}</span>
      </button>

      {historyOpen &&
        (isActive ? (
          <div className="sb-history-list">
            <button className="sb-history-item is-active" type="button">
              <span className="ti">{concept}</span>
              <span className="mt">진행 중 · {STAGE_LABELS[stage]}</span>
            </button>
          </div>
        ) : (
          <div className="sb-history-list">
            <div className="sb-empty">히스토리가 없습니다</div>
          </div>
        ))}

      <div className="sb-spacer" />

      <div className="sb-foot">
        <div className="sb-user">
          <div className="sb-avatar">유</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-user-name">유아이볼</div>
            <div className="sb-user-meta">Free plan</div>
          </div>
        </div>
        <div className="sb-quota">
          <span className="pill">{I.figma} 10건</span>
          <span className="pill">{I.image} 50건</span>
        </div>
        <button className="sb-upgrade" type="button">
          플랜 업그레이드 →
        </button>
      </div>
    </aside>
  );
}
