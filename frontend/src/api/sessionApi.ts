import { API_BASE_URL, ApiPaths } from "./contract";
import type {
  SessionGetResponse,
  SessionIndexEntry,
  SessionListResponse,
  SessionSaveRequest,
} from "./contract";
import type { SessionState } from "../state/sessionState";
import { authHeaders } from "./authHeaders";

/**
 * 학습 세션 Firestore 영속화 API 클라이언트.
 * 모든 호출은 Functions 경유(브라우저 Firestore 직접 접근 금지)이며 Authorization: Bearer 를 싣는다.
 *
 * 이 계층은 throw 한다. 호출 측(App.tsx 백그라운드 동기화)이 실패를 삼키고
 * 다음 저장 트리거에서 조용히 재시도하는 정책을 책임진다.
 */
export class SessionApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function throwFromResponse(res: Response, fallbackMsg: string): Promise<never> {
  let code = "PERSIST_ERROR";
  let message = `${fallbackMsg}: HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.code) code = body.code as string;
    if (body?.message) message = body.message as string;
  } catch {
    /* ignore */
  }
  throw new SessionApiError(code, message);
}

/** 세션 본문을 서버에 upsert 한다. fieldUpdatedAt 를 포함한 전체 SessionState 를 보낸다. */
export async function saveSessionRemote(state: SessionState): Promise<void> {
  const payload: SessionSaveRequest = { state };
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.SESSION_SAVE}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new SessionApiError("PERSIST_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) await throwFromResponse(res, "세션 저장 실패");
}

/** uid 의 세션 메타 목록을 서버 수신 시각 내림차순으로 가져온다. */
export async function listSessionsRemote(): Promise<SessionIndexEntry[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.SESSION_LIST}`, {
      method: "GET",
      headers: await authHeaders(),
    });
  } catch (e) {
    throw new SessionApiError("PERSIST_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) await throwFromResponse(res, "세션 목록 조회 실패");
  const body = (await res.json()) as SessionListResponse;
  return body.sessions ?? [];
}

/** 단일 세션 본문을 가져온다. 서버에 없으면 null. */
export async function getSessionRemote(id: string): Promise<SessionState | null> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}${ApiPaths.SESSION_GET}?id=${encodeURIComponent(id)}`,
      { method: "GET", headers: await authHeaders() },
    );
  } catch (e) {
    throw new SessionApiError("PERSIST_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) await throwFromResponse(res, "세션 조회 실패");
  const body = (await res.json()) as SessionGetResponse;
  return body.state ?? null;
}
