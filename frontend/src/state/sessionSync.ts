import {
  deserializeSessionState,
  serializeSessionState,
  type SessionState,
} from "./sessionState";
import { loadSession, persistSession } from "./sessionPersist";
import type { SessionMeta } from "./sessionIndex";
import { mergeSessions, stampFieldUpdatedAt } from "./sessionMerge";
import { getSessionRemote, listSessionsRemote, saveSessionRemote } from "../api/sessionApi";
import type { SessionIndexEntry } from "../api/contract";

/**
 * 캐시 우선 + Firestore 백그라운드 동기화 계층.
 * 순수 코어(stampFieldUpdatedAt/mergeSessions)와 localStorage 캐시(persistSession/loadSession)를
 * 조합해 "Firestore = 진실의 출처, localStorage = 캐시" 모델을 구현한다.
 */

/** 직전 캐시가 없을 때 stampFieldUpdatedAt 의 baseline 으로 쓰는 빈 prev(모든 필드 미정의 → 첫 저장 시 전 필드 스탬핑). */
const EMPTY_PREV = { fieldUpdatedAt: {} } as SessionState;

/**
 * 캐시에 즉시 저장하고, 변경이 있으면 Firestore 저장을 논블로킹으로 던진다.
 *
 * 1) 직전 캐시 대비 변경된 최상위 필드만 nowIso 로 스탬핑한다(stampFieldUpdatedAt).
 * 2) 스탬프를 반영한 본문을 localStorage 캐시에 즉시 저장한다(화면은 캐시로 이미 반영됨).
 * 3) remote 이고 내용이 실제로 바뀌었으면 saveSessionRemote 를 await 하지 않고 던진다.
 *    실패는 삼킨다(캐시값 유지, 사용자 비알림, 다음 저장 트리거에서 조용히 재시도).
 *
 * @param opts.remote Firestore 동기화 여부(기본 true). input 단계 초안은 false 로 원격에 올리지 않는다.
 * @returns 스탬프가 반영되어 캐시에 저장된 본문.
 */
export function persistWithSync(
  snapshot: SessionState,
  storage: Storage = localStorage,
  opts: { remote?: boolean } = {},
): SessionState {
  const remote = opts.remote ?? true;

  const cached = loadSession(snapshot.sessionId, storage);
  const nowIso = new Date().toISOString();
  const fieldUpdatedAt = stampFieldUpdatedAt(cached ?? EMPTY_PREV, snapshot, nowIso);
  const stamped: SessionState = { ...snapshot, fieldUpdatedAt };

  persistSession(stamped, storage);

  const changed = !cached || serializeSessionState(cached) !== serializeSessionState(stamped);
  if (remote && changed) {
    void saveSessionRemote(stamped).catch(() => {
      // 동기화 실패: 캐시 유지/비알림. 다음 트리거에서 재시도된다.
    });
  }
  return stamped;
}

/**
 * Firestore 에서 세션 본문을 가져와 캐시와 필드별 최신 승자 병합한다.
 *
 * - 원격에 없으면 null(병합/리마운트 불필요).
 * - 캐시가 없으면 원격을 그대로 채택(다기기 신규 유입).
 * - 동률(타임스탬프 동일)은 서버(원격) 우선: mergeSessions(cache, remote, serverWins='b').
 * - 병합 결과가 캐시와 동일하면 null 을 반환해 불필요한 리마운트/저장을 막는다.
 * - 병합 결과가 다르면 캐시에 반영하고 그 본문을 반환한다.
 *
 * 원격 본문은 JSON 라운드트립(deserialize)로 정규화해 fieldUpdatedAt 등 형태를 안전화한다.
 */
export async function fetchAndMerge(
  sessionId: string,
  storage: Storage = localStorage,
): Promise<SessionState | null> {
  const raw = await getSessionRemote(sessionId);
  if (!raw) return null;
  const remote = deserializeSessionState(JSON.stringify(raw));
  const cached = loadSession(sessionId, storage);
  const merged = cached ? mergeSessions(cached, remote, "b") : remote;

  const before = cached ? serializeSessionState(cached) : null;
  if (before === serializeSessionState(merged)) return null;

  persistSession(merged, storage);
  return merged;
}

/**
 * 사이드바 세션 목록에 원격 전용 세션을 합친다.
 *
 * 로컬 메타(현재 기기에서 작업 중인 것)는 그대로 두고, 로컬에 없는 원격 세션만 추가한다.
 * 원격 항목은 createdAt 이 없으므로 정렬용으로 updatedAt(서버 수신 millis)을 대입한다.
 * 결과는 createdAt 내림차순.
 */
export function mergeSessionLists(
  local: SessionMeta[],
  remote: SessionIndexEntry[],
): SessionMeta[] {
  const byId = new Map<string, SessionMeta>(local.map((m) => [m.sessionId, m]));
  for (const r of remote) {
    if (!byId.has(r.sessionId)) {
      byId.set(r.sessionId, {
        sessionId: r.sessionId,
        createdAt: r.updatedAt,
        conceptSummary: r.conceptSummary,
        stage: r.stage,
        parentSessionId: r.parentSessionId,
      });
    }
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** listSessionsRemote 래퍼. 실패 시 빈 배열(호출 측은 로컬 목록을 유지). */
export async function fetchRemoteSessionList(): Promise<SessionIndexEntry[]> {
  try {
    return await listSessionsRemote();
  } catch {
    return [];
  }
}
