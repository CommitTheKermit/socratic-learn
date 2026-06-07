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
 * - 해당 uid 의 컬렉션에 sessionId 가 없으면 → 멱등 성공 200 { ok: true, alreadyAbsent: true }
 *   (컬렉션이 uid 로 격리돼 있어 남의 세션엔 접근 자체가 불가능하다. 따라서 "없음"은
 *    "이미 삭제됨/로컬 전용이라 원격 미저장"을 뜻하며, 멱등 삭제로 성공 처리한다.)
 * - 삭제 성공 → 200 { ok: true }
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
        // uid 격리 컬렉션이라 여기서 "없음"은 남의 세션이 아니라 이미 없음/로컬 전용을 뜻한다.
        // 멱등 삭제: 없는 것을 지우는 건 성공으로 처리해 로컬 전용 세션도 삭제할 수 있게 한다.
        res.json({ ok: true, alreadyAbsent: true });
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
