import { memo, useState, Fragment, type ReactElement, type RefObject } from "react";
import { I } from "./icons";
import { STAGE_LABELS, type Stage } from "../stages/data";
import { getSessionItemKey } from "../state/sessionIndex";
import type { SessionMeta } from "../state/sessionIndex";
import type { HistoryNode } from "../state/historyForest";

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

interface ForestHandlers {
  activeSessionId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * 부모-하위 트리(방향 A) 노드 1개를 재귀 렌더한다.
 * depth 0 = 일반 히스토리 항목(삭제 가능), 그 아래 = 실제 시작된 하위 세션 트리.
 */
function renderHistoryNode(node: HistoryNode, h: ForestHandlers, key: string): ReactElement {
  const id = node.sessionId;
  const isActive = id === h.activeSessionId;
  const subtree =
    node.children.length > 0 ? (
      <div className="sb-subtree">
        {node.children.map((c, i) => renderHistoryNode(c, h, key + "/" + i))}
      </div>
    ) : null;
  if (node.depth === 0) {
    return (
      <Fragment key={key}>
        <SessionItem
          sessionId={id}
          conceptSummary={node.concept}
          stage={node.stage as Stage}
          createdAt={node.createdAt ?? 0}
          isActive={isActive}
          onSelect={h.onSelect}
          onDelete={h.onDelete}
        />
        {subtree}
      </Fragment>
    );
  }
  return (
    <Fragment key={key}>
      <div
        className={"sb-sub-item" + (isActive ? " is-active" : "")}
        aria-current={isActive ? "true" : undefined}
      >
        <button className="sb-sub-open" type="button" onClick={() => h.onSelect(id)}>
          <span className="sb-sub-main">
            <span className="sb-sub-title">
              {isActive && <span className="sb-hi-livedot is-sub" />}
              <span className="nm">{node.concept}</span>
            </span>
            <span className="sb-sub-meta">
              <span className="stg">{STAGE_LABELS[node.stage as Stage]}</span>
              <span className="sep"> · </span>
              {isActive ? "진행 중" : relTime(node.createdAt ?? 0)}
            </span>
          </span>
        </button>
      </div>
      {subtree}
    </Fragment>
  );
}

/**
 * 학습 히스토리 목록 로딩 스켈레톤.
 * 실제 .sb-history-item(제목+메타 2줄) 박스 모델에 맞춘 골격 바를 rows 개 그려, 목록이 들어올
 * 자리를 자리 이동 없이 그대로 그린다. 셰브론 반짝임은 각 바 안에서만 흐른다(차분한 톤).
 * 순수 장식이라 aria-hidden.
 */
function HistorySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="sb-hist-skel" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="shi" key={i}>
          <div className="shi-main">
            <div className="shi-bar shi-title" />
            <div className="shi-bar shi-meta" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  /** "업데이트 소식" 항목 클릭. 좌측 플라이아웃 패널을 연다. */
  onWhatsNew?: () => void;
  /** 아직 안 본 새 버전이 있으면 항목에 빨간 점(핑)을 표시한다. */
  wnUnseen?: boolean;
  /** 부모-하위 트리(방향 A) 표시 모델. 있으면 평면 목록 대신 트리로 렌더한다. */
  forest?: HistoryNode[];
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
  onWhatsNew,
  wnUnseen = false,
  forest,
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

      <button className="sb-item sb-wn" type="button" onClick={onWhatsNew}>
        <span className="ico">{I.sparkle}</span>
        업데이트
        {wnUnseen && <span className="wn-sb-dot is-ping" aria-hidden />}
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
              {forest
                ? forest.map((n, i) =>
                    renderHistoryNode(
                      n,
                      {
                        activeSessionId,
                        onSelect: onSelectSession ?? (() => {}),
                        onDelete: onDeleteSession ?? (() => {}),
                      },
                      String(i),
                    ),
                  )
                : sessions.map((s) => (
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
        ) : loggedIn || authPending ? (
          // 목록 fetch 진행 중(로그인됨/인증 미확정) → 로딩 스켈레톤.
          // 비로그인은 fetch 자체가 없어 sessions 가 영영 undefined 이므로 스켈레톤 대신 빈 상태.
          <HistorySkeleton />
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
            <span className="sb-feedback-title">피드백 부탁드립니다!</span>
            <span className="sb-feedback-mail">commit3921@gmail.com</span>
          </span>
        </a>
        {/* 인증 영역: 상태(펜딩/로그인/로그아웃)마다 콘텐츠 높이가 달라 UI 가 흔들리므로
            가장 큰 상태(로그아웃) 높이로 슬롯을 예약하고 세로 중앙 정렬해 고정한다. */}
        <div className="sb-auth-slot">
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
                <div className="sb-auth-title">로그인하면 학습 기록이 기기 간에 이어져요</div>
              </div>
              <button className="sb-login" type="button" onClick={onLogin}>
                로그인
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
