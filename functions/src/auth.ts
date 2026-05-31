import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import * as logger from "firebase-functions/logger";

// admin SDK 1회 초기화. emulator/배포 모두 자격증명이 자동 주입된다
// (배포: 런타임 서비스계정, emulator: FIREBASE_AUTH_EMULATOR_HOST/FIRESTORE_EMULATOR_HOST).
if (getApps().length === 0) initializeApp();

/**
 * Authorization: Bearer <Firebase ID 토큰> 을 검증해 uid 를 반환한다.
 * 헤더 부재/검증 실패 시 401 을 응답하고 null 을 반환한다(호출자는 즉시 return).
 * 게이팅(로그인 필수)의 서버측 강제 지점.
 */
export async function requireAuth(req: Request, res: Response): Promise<string | null> {
  const header = req.headers.authorization ?? "";
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) {
    res.status(401).json({ code: "UNAUTHENTICATED", message: "로그인이 필요합니다." });
    return null;
  }
  try {
    const decoded = await getAuth().verifyIdToken(m[1]);
    return decoded.uid;
  } catch (e) {
    logger.warn("verifyIdToken failed", e);
    res.status(401).json({ code: "UNAUTHENTICATED", message: "유효하지 않은 인증 토큰입니다." });
    return null;
  }
}

/**
 * 사용량 1건을 Firestore usage 컬렉션에 기록한다(fire-and-forget).
 * 응답 지연을 피하려 await 하지 않으며, 실패는 로깅만 한다.
 */
export function recordUsage(uid: string, endpoint: string): void {
  getFirestore()
    .collection("usage")
    .add({ uid, endpoint, timestamp: FieldValue.serverTimestamp() })
    .catch((e) => logger.error("recordUsage failed", e));
}
