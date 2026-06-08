import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { sessionListsEqual, type SessionMeta } from "./sessionIndex";
import type { SessionState } from "./sessionState";
import { fetchRemoteSessionList, mergeSessionLists } from "./sessionSync";
import { addTombstone, listTombstones, removeTombstone } from "./sessionTombstone";
import { sessionKey } from "./sessionPersist";
import { deleteSessionRemote } from "../api/sessionApi";
import { useAuth } from "./useAuth";

/**
 * 사이드바 세션 목록을 라우트 재마운트에서 격리하는 전역 Context.
 *
 * App 의 Routes 바깥에 SessionListProvider 를 두므로, 같은 세션 내 단계 전환
 * (probe→learn→done)으로 라우트가 바뀌어 워크스페이스가 재마운트되어도 목록 상태(sessions)
 * 는 사라졌다 다시 로딩되지 않는다(깜빡임 제거). 목록의 진실 출처는 Firestore(원격)이고,
 * 현재 기기에서 작업 중인 세션 메타는 upsertSession 으로 메모리 목록에 직접 반영한다.
 */
export interface SessionListValue {
  /** 사이드바 목록. undefined 는 "로그인 전 / 첫 fetch 진행 중"(로딩) 을 뜻한다. */
  sessions: SessionMeta[] | undefined;
  /** 현재 세션의 스냅샷을 목록에 반영(upsert)한다. input 단계는 히스토리에 노출하지 않는다. */
  upsertSession: (snapshot: SessionState) => void;
  /** 세션을 목록/본문 캐시/원격에서 낙관적으로 제거한다(원격 실패해도 롤백 없음, tombstone 차단). */
  removeSession: (id: string) => void;
}

const SessionListContext = createContext<SessionListValue | null>(null);

/**
 * 현재 세션 메타를 목록에 upsert 한다.
 * - input 단계(= 학습 시작 전)는 히스토리 미노출 → prev 유지
 * - 같은 sessionId 는 갱신, 없으면 추가 후 createdAt 내림차순 정렬
 * - 결과가 prev 와 동일하면 참조 안정성을 위해 prev 를 그대로 반환
 */
function upsertVisible(
  prev: SessionMeta[] | undefined,
  snapshot: SessionState,
): SessionMeta[] | undefined {
  if (snapshot.stage === "input") return prev;
  const meta: SessionMeta = {
    sessionId: snapshot.sessionId,
    createdAt: snapshot.createdAt,
    conceptSummary: snapshot.conceptSummary,
    stage: snapshot.stage,
  };
  const base = prev ?? [];
  const others = base.filter((m) => m.sessionId !== meta.sessionId);
  const next = [meta, ...others].sort((a, b) => b.createdAt - a.createdAt);
  return prev !== undefined && sessionListsEqual(prev, next) ? prev : next;
}

export function SessionListProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionMeta[] | undefined>(undefined);
  const { user } = useAuth();
  // user 객체는 렌더마다 참조가 바뀔 수 있으므로(테스트 mock 포함) uid 로 의존성을 안정화한다.
  const uid = user?.uid ?? null;

  // 로그인(uid 확정) 시 원격 목록을 받아 채운다. 비로그인(uid 없음)이면 fetch 하지 않아
  // sessions 는 undefined(로딩) 로 남는다. fetchRemoteSessionList 는 실패 시 [] 를 반환하므로
  // user 가 있는 한 fetch 후 sessions 는 [] 또는 채워진 배열로 확정된다(무한 로딩 아님).
  // refreshList 는 노출하지 않는다 - 재로그인/재접속(uid 변화)이 자연 재시도 역할을 한다.
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    void fetchRemoteSessionList().then((remote) => {
      if (!alive) return;
      const tombstoned = listTombstones();
      // tombstone 세션은 원격 삭제 재시도(성공 시 해제). 실패는 다음 접속에 재시도.
      for (const id of tombstoned) {
        void deleteSessionRemote(id)
          .then(() => removeTombstone(id))
          .catch(() => {});
      }
      const visible = remote.filter((r) => !tombstoned.has(r.sessionId));
      setSessions((prev) => {
        const merged = mergeSessionLists(prev ?? [], visible);
        return prev !== undefined && sessionListsEqual(prev, merged) ? prev : merged;
      });
    });
    return () => {
      alive = false;
    };
  }, [uid]);

  const upsertSession = useCallback((snapshot: SessionState) => {
    setSessions((prev) => upsertVisible(prev, snapshot));
  }, []);

  const removeSession = useCallback((id: string) => {
    // 본문 캐시 즉시 제거(낙관적) + tombstone 기록.
    try {
      addTombstone(id);
      localStorage.removeItem(sessionKey(id));
    } catch {
      // 무시
    }
    // 화면 목록(메모리)에서 해당 id 만 제거한다.
    setSessions((prev) => {
      if (!prev) return prev;
      const next = prev.filter((m) => m.sessionId !== id);
      return next.length === prev.length ? prev : next;
    });
    // 원격 삭제는 백그라운드. 성공 시 tombstone 해제, 실패 시 유지(다음 접속 재시도).
    void deleteSessionRemote(id)
      .then(() => removeTombstone(id))
      .catch((e) => {
        console.error("[removeSession] 원격 삭제 실패, tombstone 유지(다음 접속 재시도):", e);
      });
  }, []);

  const value = useMemo<SessionListValue>(
    () => ({ sessions, upsertSession, removeSession }),
    [sessions, upsertSession, removeSession],
  );

  return <SessionListContext.Provider value={value}>{children}</SessionListContext.Provider>;
}

export function useSessionList(): SessionListValue {
  const ctx = useContext(SessionListContext);
  if (!ctx) throw new Error("useSessionList must be used within SessionListProvider");
  return ctx;
}
