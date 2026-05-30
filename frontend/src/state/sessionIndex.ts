import type { Stage } from "../stages/data";

/**
 * localStorage 단일 인덱스 키에 저장되는 세션 메타데이터 한 건.
 * 전체 세션 본문(SessionState)과 분리되어, 사이드바 히스토리 렌더링에 필요한 최소 정보만 담는다.
 */
export interface SessionMeta {
  sessionId: string;
  createdAt: number;
  conceptSummary: string;
  stage: Stage;
}

/** 모든 세션 메타를 모아두는 localStorage 단일 키. */
export const SESSIONS_INDEX_KEY = "socratic:sessions:index";

const STAGES: readonly Stage[] = ["input", "probe", "learn", "done"];

function asStage(v: unknown): Stage {
  return typeof v === "string" && (STAGES as readonly string[]).includes(v)
    ? (v as Stage)
    : "input";
}

/** 임의 값을 SessionMeta 한 건으로 보정한다. sessionId 가 비정상이면 null 을 반환해 제외한다. */
function toMeta(v: unknown): SessionMeta | null {
  if (v == null || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.sessionId !== "string" || o.sessionId.length === 0) return null;
  return {
    sessionId: o.sessionId,
    createdAt:
      typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : 0,
    conceptSummary: typeof o.conceptSummary === "string" ? o.conceptSummary : "",
    stage: asStage(o.stage),
  };
}

/**
 * 세션 인덱스를 읽어 createdAt 내림차순으로 정렬해 반환한다.
 *
 * 폴백 정책(누락/손상 → 안전 기본값):
 * - 키 없음: 빈 배열.
 * - JSON 파싱 실패 또는 배열이 아님: 빈 배열.
 * - 배열 내 손상 항목(객체 아님/ sessionId 누락): 해당 항목만 제외.
 *
 * storage 는 테스트에서 mock 주입이 가능하도록 인자로 받는다(기본 localStorage).
 */
export function listSessions(storage: Storage = localStorage): SessionMeta[] {
  const raw = storage.getItem(SESSIONS_INDEX_KEY);
  if (raw == null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const metas = parsed
    .map(toMeta)
    .filter((m): m is SessionMeta => m !== null);
  return metas.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 인덱스에 메타를 추가하거나, 같은 sessionId 가 있으면 갱신(덮어쓰기)한다.
 * storage 는 테스트에서 mock 주입이 가능하도록 인자로 받는다(기본 localStorage).
 */
export function upsertSessionMeta(meta: SessionMeta, storage: Storage = localStorage): void {
  const current = listSessions(storage);
  const next = current.filter((m) => m.sessionId !== meta.sessionId);
  next.push(meta);
  storage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(next));
}

/**
 * 인덱스에서 주어진 sessionId 의 메타를 제거한다(없으면 변화 없음).
 * storage 는 테스트에서 mock 주입이 가능하도록 인자로 받는다(기본 localStorage).
 */
export function removeSessionMeta(id: string, storage: Storage = localStorage): void {
  const next = listSessions(storage).filter((m) => m.sessionId !== id);
  storage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(next));
}
