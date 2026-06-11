import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { requireAuth, recordUsage } from "./auth";
import { CORS_ORIGINS } from "./cors";

// 학습 세션 Firestore 영속화 엔드포인트(Anthropic 미사용 → ANTHROPIC_API_KEY secret 불필요).
// 저장 모델: Firestore = 진실의 출처, 본문 병합은 클라이언트 코어(mergeSessions)가 수행한다.
// 서버는 본문을 불투명 JSON 으로 저장하고 동률 tiebreaker 용 serverUpdatedAt 만 덧붙이는 dumb upsert 다.
//
// uid 격리 구조: sessions/{uid}/items/{sessionId}. 타인 uid 의 문서는 경로상 접근 불가하다.

/** 세션 문서 1건의 저장 형태. state 는 클라이언트 SessionState 본문(불투명), 메타는 목록 조회용 평면화. */
interface SessionDoc {
  state: Record<string, unknown>;
  conceptSummary: string;
  stage: string;
  serverUpdatedAt: Timestamp;
}

function itemsCol(uid: string) {
  return getFirestore().collection("sessions").doc(uid).collection("items");
}

/** Timestamp → epoch millis(목록 정렬/표시용). 누락 시 0. */
function toMillis(v: unknown): number {
  return v instanceof Timestamp ? v.toMillis() : 0;
}

/**
 * POST /sessionSave - 세션 본문을 uid 격리 컬렉션에 upsert 한다.
 * body: { state: SessionState }. state.sessionId 로 문서 키를 정한다.
 */
export const sessionSave = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }
    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "sessionSave");

    const state = (req.body ?? {}).state as Record<string, unknown> | undefined;
    const sessionId = state?.sessionId;
    if (!state || typeof sessionId !== "string" || sessionId.length === 0) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "state.sessionId 가 필요합니다." });
      return;
    }

    try {
      const doc: SessionDoc = {
        state,
        conceptSummary: typeof state.conceptSummary === "string" ? state.conceptSummary : "",
        stage: typeof state.stage === "string" ? state.stage : "input",
        // upsert 시점의 서버 수신 시각. 동률(fieldUpdatedAt 동일) tiebreaker 의 진실 출처.
        serverUpdatedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
      };
      await itemsCol(uid).doc(sessionId).set(doc);
      res.json({ ok: true });
    } catch (e) {
      logger.error("sessionSave failed", e);
      res.status(500).json({
        code: "PERSIST_ERROR",
        message: e instanceof Error ? e.message : "세션 저장 실패",
      });
    }
  },
);

/**
 * GET /sessionList - uid 의 세션 메타 목록을 serverUpdatedAt 내림차순으로 반환한다(본문 미포함).
 * 응답: { sessions: SessionIndexEntry[] }.
 */
export const sessionList = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "GET only" });
      return;
    }
    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "sessionList");

    try {
      const snap = await itemsCol(uid).orderBy("serverUpdatedAt", "desc").get();
      const sessions = snap.docs.map((d) => {
        const data = d.data() as Partial<SessionDoc>;
        return {
          sessionId: d.id,
          conceptSummary: typeof data.conceptSummary === "string" ? data.conceptSummary : "",
          stage: typeof data.stage === "string" ? data.stage : "input",
          updatedAt: toMillis(data.serverUpdatedAt),
        };
      });
      res.json({ sessions });
    } catch (e) {
      logger.error("sessionList failed", e);
      res.status(500).json({
        code: "PERSIST_ERROR",
        message: e instanceof Error ? e.message : "세션 목록 조회 실패",
      });
    }
  },
);

/**
 * GET /sessionGet?id=<sessionId> - 단일 세션 본문을 반환한다.
 * 응답: { state: SessionState | null }(없으면 null).
 */
export const sessionGet = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "GET only" });
      return;
    }
    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "sessionGet");

    const id = req.query.id;
    if (typeof id !== "string" || id.length === 0) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "id 쿼리 파라미터가 필요합니다." });
      return;
    }

    try {
      const doc = await itemsCol(uid).doc(id).get();
      const data = doc.exists ? (doc.data() as Partial<SessionDoc>) : undefined;
      res.json({ state: data?.state ?? null });
    } catch (e) {
      logger.error("sessionGet failed", e);
      res.status(500).json({
        code: "PERSIST_ERROR",
        message: e instanceof Error ? e.message : "세션 조회 실패",
      });
    }
  },
);
