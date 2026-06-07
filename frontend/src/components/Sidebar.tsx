import { memo, useState, type RefObject } from "react";
import { I } from "./icons";
import { STAGE_LABELS, type Stage } from "../stages/data";
import { getSessionItemKey } from "../state/sessionIndex";
import type { SessionMeta } from "../state/sessionIndex";

export interface SessionItemProps {
  sessionId: string;
  conceptSummary: string;
  stage: Stage;
  createdAt: number;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function relTime(ts: number): string {
  if (!ts) return "";
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/**
 * 히스토리 목록 단일 행. React.memo 로 래핑해 부모 리렌더 시
 * props 가 변하지 않은 비활성 항목의 리마운트/리렌더를 방지한다.
 */
export const SessionItem = memo(function SessionItem({
  sessionId,
  conceptSummary,
  stage,
  createdAt,
  isActive,
  onSelect,
  onDelete,
}: SessionItemProps) {
  return (
    <div
      className={"sb-history-item" + (isActive ? " is-active" : "")}
      aria-current={isActive ? "true" : undefined}
    >
      <button
        className="sb-history-open"
        type="button"
        onClick={() => onSelect(sessionId)}
      >
        <span className="sb-hi-main">
          <span className="sb-hi-title">
            {isActive && <span className="sb-hi-livedot" />}
            <span className="nm">{conceptSummary}</span>
          </span>
          <span className="sb-hi-meta">
            <span className="stg">{STAGE_LABELS[stage]}</span>
            <span className="sep">·</span>
            {isActive ? "진행 중" : relTime(createdAt)}
          </span>
        </span>
      </button>
      <button
        className="sb-hi-del"
        type="button"
        aria-label="세션 삭제"
        onClick={() => onDelete(sessionId)}
      >
        {I.trash}
      </button>
    </div>
  );
});

interface Props {
  stage: Stage;
  concept: string;
  /** 드로워(aside) DOM 참조. 고정(open) 시 포커스 이동에 쓴다. */
  drawerRef?: RefObject<HTMLElement>;
  /** 드로워 3단계 상태. hidden 일 때 aria-hidden 을 부여한다. */
  drawerState?: "hidden" | "peek" | "open";
  /** 드로워 안 "숨기기" 버튼: 드로워를 hidden 으로 되돌린다. */
  onHide?: () => void;
  onNewSession: () => void;
  sessions?: SessionMeta[];
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  /** Auth 복원 미확정. true 면 로그인/사용자 영역 대신 중립 placeholder 를 보여 깜빡임을 막는다. */
  authPending?: boolean;
  loggedIn?: boolean;
  userName?: string;
  photoURL?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

export function Sidebar({
  stage,
  concept,
  drawerRef,
  drawerState = "hidden",
  onHide,
  onNewSession,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  authPending = false,
  loggedIn = false,
  userName,
  photoURL,
  onLogin,
  onLogout,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const isActive = stage !== "input";

  return (
    <aside
      className="sidebar"
      ref={drawerRef}
      tabIndex={-1}
      role="navigation"
      aria-label="사이드바"
      aria-hidden={drawerState === "hidden" ? true : undefined}
    >
      <div className="sb-brand">
        <button
          className="sb-brand-home"
          type="button"
          aria-label="메인으로 이동"
          title="메인으로 이동"
          onClick={onNewSession}
        >
          <span className="sb-brand-mark">{I.brand}</span>
          <span className="sb-brand-name">Socratic</span>
        </button>
        <button
          className="sb-collapse"
          aria-label="사이드바 숨기기"
          title="사이드바 숨기기"
          onClick={onHide}
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
        <span className="ico">{I.newLearn}</span>
        새로 학습하기
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
              {sessions.map((s) => (
                <SessionItem
                  key={getSessionItemKey(s)}
                  sessionId={s.sessionId}
                  conceptSummary={s.conceptSummary}
                  stage={s.stage}
                  createdAt={s.createdAt}
                  isActive={s.sessionId === activeSessionId}
                  onSelect={onSelectSession ?? (() => {})}
                  onDelete={onDeleteSession ?? (() => {})}
                />
              ))}
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
        <a
          className="sb-feedback"
          href="mailto:commit3921@gmail.com?subject=Socratic%20Learn%20%ED%94%BC%EB%93%9C%EB%B0%B1"
        >
          <span className="sb-feedback-ico">{I.mail}</span>
          <span className="sb-feedback-text">
            <span className="sb-feedback-title">피드백을 부탁드립니다!</span>
            <span className="sb-feedback-mail">commit3921@gmail.com</span>
          </span>
        </a>
        {authPending ? (
          <div className="sb-user sb-user-pending" aria-hidden>
            <div className="sb-avatar" />
            <div className="sb-user-name sb-skeleton-line" />
          </div>
        ) : loggedIn ? (
          <div className="sb-user">
            <div className="sb-avatar">
              {photoURL ? (
                <img
                  className="sb-avatar-img"
                  src={photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                (userName?.[0] ?? "유").toUpperCase()
              )}
            </div>
            <div className="sb-user-name">{userName ?? "사용자"}</div>
            <button
              className="sb-signout"
              type="button"
              aria-label="로그아웃"
              onClick={onLogout}
            >
              {I.signout}
            </button>
          </div>
        ) : (
          <div className="sb-auth">
            <div className="sb-auth-row">
              <div className="sb-auth-avatar">{I.userOutline}</div>
              <div className="sb-auth-title">학습 시작을 위해 로그인이 필요해요</div>
            </div>
            <button className="sb-login" type="button" onClick={onLogin}>
              로그인
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
