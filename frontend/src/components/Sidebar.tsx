import { useState } from "react";
import { I } from "./icons";
import { STAGE_LABELS, type Stage } from "../stages/data";
import type { SessionMeta } from "../state/sessionIndex";

interface Props {
  stage: Stage;
  concept: string;
  onNewSession: () => void;
  onToggleCollapse: () => void;
  sessions?: SessionMeta[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

export function Sidebar({
  stage,
  concept,
  onNewSession,
  onToggleCollapse,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const isActive = stage !== "input";

  const relTime = (ts: number): string => {
    if (!ts) return "";
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

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
        (sessions !== undefined ? (
          sessions.length > 0 ? (
            <div className="sb-history-list">
              {sessions.map((s) => {
                const active = s.sessionId === activeSessionId;
                return (
                  <div
                    key={s.sessionId}
                    className={"sb-history-item" + (active ? " is-active" : "")}
                    aria-current={active ? "true" : undefined}
                  >
                    <button
                      className="sb-history-open"
                      type="button"
                      onClick={() => onSelectSession?.(s.sessionId)}
                    >
                      <span className="sb-hi-main">
                        <span className="sb-hi-title">
                          {active && <span className="sb-hi-livedot" />}
                          <span className="nm">{s.conceptSummary}</span>
                        </span>
                        <span className="sb-hi-meta">
                          <span className="stg">{STAGE_LABELS[s.stage]}</span>
                          <span className="sep">·</span>
                          {active ? "진행 중" : relTime(s.createdAt)}
                        </span>
                      </span>
                    </button>
                    <button
                      className="sb-hi-del"
                      type="button"
                      aria-label="세션 삭제"
                      onClick={() => onDeleteSession?.(s.sessionId)}
                    >
                      {I.trash}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sb-history-list">
              <div className="sb-empty">히스토리가 없습니다</div>
            </div>
          )
        ) : isActive ? (
          <div className="sb-history-list">
            <div className="sb-history-item is-active">
              <button className="sb-history-open" type="button">
                <span className="sb-hi-main">
                  <span className="sb-hi-title">
                    <span className="sb-hi-livedot" />
                    <span className="nm">{concept}</span>
                  </span>
                  <span className="sb-hi-meta">
                    <span className="stg">{STAGE_LABELS[stage]}</span>
                    <span className="sep">·</span>
                    진행 중
                  </span>
                </span>
              </button>
            </div>
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
