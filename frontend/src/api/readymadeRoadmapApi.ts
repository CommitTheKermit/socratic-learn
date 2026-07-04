import { API_BASE_URL, ApiPaths } from "./contract";
import type {
  ReadymadeRoadmap,
  ReadymadeRoadmapGetResponse,
  ReadymadeRoadmapListEntry,
  ReadymadeRoadmapListResponse,
} from "./contract";
import { authHeaders } from "./authHeaders";

/**
 * ready-made 로드맵 라이브러리 API 클라이언트.
 * 세션 API 와 동일하게 Functions 경유(브라우저 Firestore 직접 접근 금지)이며 Authorization: Bearer 를 싣는다.
 * 공개 읽기지만 requireAuth 게이트가 있어 익명 로그인 토큰이라도 필요하다.
 *
 * 이 계층은 throw 한다. 호출 측(라이브러리 화면)이 로딩/에러 상태를 책임진다.
 */
export class RoadmapApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function throwFromResponse(res: Response, fallbackMsg: string): Promise<never> {
  let code = "ROADMAP_ERROR";
  let message = `${fallbackMsg}: HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.code) code = body.code as string;
    if (body?.message) message = body.message as string;
  } catch {
    /* ignore */
  }
  throw new RoadmapApiError(code, message);
}

/** 공개 로드맵 경량 메타 목록(카드 렌더링용). subject → title 순 정렬. */
export async function listReadymadeRoadmaps(): Promise<ReadymadeRoadmapListEntry[]> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${ApiPaths.READYMADE_ROADMAP_LIST}`, {
      method: "GET",
      headers: await authHeaders(),
    });
  } catch (e) {
    throw new RoadmapApiError("ROADMAP_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) await throwFromResponse(res, "로드맵 목록 조회 실패");
  const body = (await res.json()) as ReadymadeRoadmapListResponse;
  return body.roadmaps ?? [];
}

/** 단일 로드맵 전체 본문을 가져온다. 서버에 없으면 null. */
export async function getReadymadeRoadmap(id: string): Promise<ReadymadeRoadmap | null> {
  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}${ApiPaths.READYMADE_ROADMAP_GET}?id=${encodeURIComponent(id)}`,
      { method: "GET", headers: await authHeaders() },
    );
  } catch (e) {
    throw new RoadmapApiError("ROADMAP_ERROR", (e as Error)?.message ?? "네트워크 오류");
  }
  if (!res.ok) await throwFromResponse(res, "로드맵 조회 실패");
  const body = (await res.json()) as ReadymadeRoadmapGetResponse;
  return body.roadmap ?? null;
}
