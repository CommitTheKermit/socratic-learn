import { ImageAnnotatorClient } from "@google-cloud/vision";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { requireAuth } from "./auth";
import { CORS_ORIGINS } from "./cors";
import { kstDayKey, kstMinuteKey } from "./rateLimit";

const MAX_BYTES = 2 * 1024 * 1024;
let client: ImageAnnotatorClient | undefined;

export function decodeOcrImage(body: unknown): Buffer | null {
  const encoded = (body as { imageBase64?: unknown } | null)?.imageBase64;
  if (typeof encoded !== "string" || !encoded.length ||
      encoded.length > Math.ceil(MAX_BYTES / 3) * 4 ||
      encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return null;
  const image = Buffer.from(encoded, "base64");
  if (image.toString("base64") !== encoded || image.length > MAX_BYTES || image.length < 4 ||
      image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff ||
      image[image.length - 2] !== 0xff || image[image.length - 1] !== 0xd9) return null;
  return image;
}

/** 호출 전에 한도를 원자적으로 예약한다. 실패/취소도 차감해 재시도 폭주를 제한한다. */
export async function reserveOcrUsage(uid: string, now = new Date()): Promise<boolean> {
  const db = getFirestore();
  const day = kstDayKey(now);
  const limits = [Number(process.env.OCR_DAILY_LIMIT ?? 20), 5, Number(process.env.OCR_MONTHLY_LIMIT ?? 10000)];
  if (limits.some((limit) => !Number.isSafeInteger(limit) || limit <= 0)) return false;
  // ponytail: 전체 월 카운터 한 문서, 높은 동시 사용량에서 경합이 확인되면 할당량 분할 도입.
  const refs = [
    `user_${uid}_${day}`, `burst_${uid}_${kstMinuteKey(now)}`, `total_${day.slice(0, 7)}`,
  ].map((id) => db.collection("ocrUsageCounters").doc(id));
  return db.runTransaction(async (tx) => {
    const snapshots = await tx.getAll(...refs);
    const counts = snapshots.map((snapshot) => snapshot.data()?.count ?? 0);
    if (counts.some((count, i) => !Number.isSafeInteger(count) || count < 0 || count >= limits[i])) return false;
    refs.forEach((ref, i) => tx.set(ref, {
      count: counts[i] + 1,
      expireAt: Timestamp.fromMillis(now.getTime() + 62 * 24 * 60 * 60 * 1000),
    }));
    return true;
  });
}

export const answerOcr = onRequest(
  { cors: CORS_ORIGINS, region: "us-central1", timeoutSeconds: 45, maxInstances: 3 },
  async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") {
      res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST only" });
      return;
    }
    const uid = await requireAuth(req, res);
    if (!uid) return;
    const image = decodeOcrImage(req.body);
    if (!image) {
      res.status(400).json({ code: "INVALID_IMAGE", message: "2MB 이하의 JPEG 사진으로 다시 촬영해 주세요." });
      return;
    }
    try {
      if (!await reserveOcrUsage(uid)) {
        res.status(429).json({ code: "OCR_LIMIT", message: "사진 인식 사용 한도에 도달했어요. 키보드로 답변을 입력해 주세요." });
        return;
      }
    } catch {
      logger.error("OCR quota check failed");
      res.status(503).json({ code: "OCR_UNAVAILABLE", message: "사용량을 확인하지 못했어요. 잠시 후 다시 시도해 주세요." });
      return;
    }
    try {
      client ??= new ImageAnnotatorClient();
      const [batch] = await client.batchAnnotateImages(
        { requests: [{ image: { content: image }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }] },
        { timeout: 25000, retry: null },
      );
      const result = batch.responses?.[0];
      if (!result || result.error?.code) throw new Error("Vision response error");
      const text = result.fullTextAnnotation?.text?.trim() ?? "";
      res.json({ text });
    } catch {
      // SDK 오류 객체에는 요청 이미지가 포함될 수 있으므로 기록하지 않는다.
      logger.error("OCR recognition failed");
      res.status(503).json({ code: "OCR_UNAVAILABLE", message: "사진을 읽지 못했어요. 잠시 후 재시도하거나 키보드로 입력해 주세요." });
    }
  },
);
