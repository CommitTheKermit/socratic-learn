import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { requireAuth, recordUsage } from "./auth";

function itemsCol(uid: string) {
  return getFirestore().collection("sessions").doc(uid).collection("items");
}

/**
 * POST /sessionDelete - uid 격리 컬렉션에서 세션을 영구 삭제한다.
 * body: { sessionId: string }.
 * - 토큰이 없거나 검증 실패 → 401
 * - 해당 uid 의 컬렉션에 sessionId 가 없으면 → 403(다른 uid 소유이거나 존재하지 않음)
 * - 삭제 성공 → 200 { ok: true }
 * 비관적 삭제: 이 엔드포인트 성공 시에만 클라이언트가 로컬에서도 제거한다.
 */
export const sessionDelete = onRequest(
  { cors: true, region: "us-central1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }
    const uid = await requireAuth(req, res);
    if (!uid) return;
    recordUsage(uid, "sessionDelete");

    const sessionId = (req.body ?? {}).sessionId;
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "sessionId 가 필요합니다." });
      return;
    }

    try {
      const docRef = itemsCol(uid).doc(sessionId);
      const snap = await docRef.get();
      if (!snap.exists) {
        // 해당 uid 의 컬렉션에 없음 = 다른 uid 소유이거나 존재하지 않음 → 403
        res.status(403).json({
          code: "FORBIDDEN",
          message: "해당 세션을 삭제할 권한이 없습니다.",
        });
        return;
      }
      await docRef.delete();
      res.json({ ok: true });
    } catch (e) {
      logger.error("sessionDelete failed", e);
      res.status(500).json({
        code: "PERSIST_ERROR",
        message: e instanceof Error ? e.message : "세션 삭제 실패",
      });
    }
  },
);
