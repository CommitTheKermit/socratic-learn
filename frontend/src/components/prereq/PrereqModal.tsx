import type { PrereqNode } from "../../api/contract";
import { PI } from "./prereqIcons";

export type PrereqStatus = "loading" | "loaded" | "empty" | "error";

/** 선행 트리 노드(재귀). 이미 학습 시작한 개념(startedConcepts)은 "이어서"로 표시. */
function TreeNode({
  node,
  startedConcepts,
  onStart,
}: {
  node: PrereqNode;
  startedConcepts: Set<string>;
  onStart: (node: PrereqNode) => void;
}) {
  const started = startedConcepts.has(node.concept);
  return (
    <div className={"pq-node" + (started ? " is-started" : "")}>
      <div className="pq-node-row">
        <span className="pq-bullet" aria-hidden />
        <span className="pq-node-main">
          <span className="pq-node-name">{node.concept}</span>
          {node.reason && <span className="pq-node-reason">{node.reason}</span>}
          {started && (
            <span className="pq-state-meta">
              <span className="sb-hi-livedot is-sub" />
              학습 진행 중
            </span>
          )}
        </span>
        <button type="button" className="pq-start" onClick={() => onStart(node)}>
          {started ? (
            <>
              {PI.arrowR}이어서
            </>
          ) : (
            <>
              {PI.play}이 개념부터 학습
            </>
          )}
        </button>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="pq-children">
          {node.children.map((c, i) => (
            <TreeNode key={i} node={c} startedConcepts={startedConcepts} onStart={onStart} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeContent({
  status,
  concept,
  tree,
  startedConcepts,
  onStart,
  onRetry,
}: {
  status: PrereqStatus;
  concept: string;
  tree: PrereqNode[];
  startedConcepts: Set<string>;
  onStart: (node: PrereqNode) => void;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return (
      <div className="pq-loading">
        <div className="pq-loading-head">
          <span className="pq-loading-dot" />
          선행 개념을 분석하고 있어요…
        </div>
        {["", "lvl1", "lvl1", "lvl2", "lvl1"].map((ind, i) => (
          <div key={i} className={"pq-skel-row " + ind}>
            <span className="pq-skel-dot" />
            <span className="pq-skel-lines">
              <span className="pq-skel-bar w1" />
              <span className="pq-skel-bar w2" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  if (status === "empty") {
    return (
      <div className="pq-msg is-empty">
        <span className="pq-msg-ico">{PI.leaf}</span>
        <span className="pq-msg-title">선행 개념이 필요 없어요</span>
        <span className="pq-msg-sub">
          지금 수준으로 충분히 따라올 수 있는 개념이에요. 이대로 학습을 이어가도 좋아요.
        </span>
        <button type="button" className="pq-retry" onClick={onRetry}>
          {PI.refresh}그래도 다시 분석
        </button>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="pq-msg is-error">
        <span className="pq-msg-ico">{PI.alert}</span>
        <span className="pq-msg-title">트리를 만들지 못했어요</span>
        <span className="pq-msg-sub">
          잠시 연결이 불안정했어요. 잠깐 뒤 다시 시도하면 대부분 해결돼요.
        </span>
        <button type="button" className="pq-retry" onClick={onRetry}>
          {PI.refresh}다시 시도
        </button>
      </div>
    );
  }
  return (
    <div className="pq-tree">
      <div className="pq-node is-root">
        <div className="pq-node-row">
          <span className="pq-bullet" aria-hidden />
          <span className="pq-node-main">
            <span className="pq-node-name">
              {concept}
              <span className="pq-tag">현재 개념</span>
            </span>
          </span>
        </div>
        <div className="pq-children">
          {tree.map((n, i) => (
            <TreeNode key={i} node={n} startedConcepts={startedConcepts} onStart={onStart} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 선행 개념 트리 모달 (방향 A). 트리거로 열고, 노드를 고르면 onStart 로 하위 세션을 만든다.
 * depthLimited=true 면(현재 세션이 깊이 2) 고른 개념이 독립 새 세션으로 시작됨을 안내한다.
 */
export function PrereqModal({
  status,
  concept,
  tree,
  startedConcepts,
  depthLimited,
  onClose,
  onStart,
  onRetry,
}: {
  status: PrereqStatus;
  concept: string;
  tree: PrereqNode[];
  startedConcepts: Set<string>;
  depthLimited?: boolean;
  onClose: () => void;
  onStart: (node: PrereqNode) => void;
  onRetry: () => void;
}) {
  return (
    <div className="pq-modal-backdrop" onClick={onClose}>
      <div
        className="pq-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="선행 개념 트리"
      >
        <div className="pq-modal-head">
          <span className="pq-trigger-ico">{PI.branch}</span>
          <span className="pq-modal-htext">
            <span className="pq-modal-eyebrow">선행 개념 트리</span>
            <span className="pq-modal-title">{concept}</span>
            <span className="pq-modal-sub">
              이 개념을 이해하려면 먼저 알면 좋은 것들이에요. 하나를 고르면 그 개념만 따로 학습해요.
            </span>
          </span>
          <button className="pq-modal-close" type="button" onClick={onClose} aria-label="닫기">
            {PI.x}
          </button>
        </div>
        <div className="pq-modal-body">
          <TreeContent
            status={status}
            concept={concept}
            tree={tree}
            startedConcepts={startedConcepts}
            onStart={onStart}
            onRetry={onRetry}
          />
        </div>
        {status === "loaded" && (
          <div className="pq-modal-foot">
            <span className="pq-modal-hint">
              {depthLimited
                ? "여기서 고른 개념은 독립된 새 학습으로 시작돼요(선행은 2단계까지만 중첩)."
                : "고른 개념은 사이드바에 하위 세션으로 쌓여요."}
            </span>
            <span className="grow" />
            <button className="btn-ghost" type="button" onClick={onClose}>
              그냥 계속할게요
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
