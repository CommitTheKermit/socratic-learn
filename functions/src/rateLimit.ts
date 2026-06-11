import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// rateLimit 단독 import 시에도 admin 이 초기화되도록 방어(auth.ts 와 동일 패턴, idempotent).
if (getApps().length === 0) initializeApp();

// uid 당 상한. Anthropic 호출 7개 엔드포인트에만 적용한다(세션 CRUD 는 제외).
export const DAILY_LIMIT = 150; // KST 자정 리셋되는 일일 호출 상한
export const BURST_LIMIT = 20; // 분당 호출 상한(버스트/런어웨이 차단)

// 카운터 도큐먼트 보관 컬렉션. id = `${uid}_d_${dayKey}` | `${uid}_m_${minuteKey}`.
const COUNTER_COLLECTION = "rateLimitCounters";

// expireAt 에 Firestore TTL 정책을 걸면 만료 도큐먼트가 자동 삭제된다(미설정 시 무해한 잉여 필드).
const DAY_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 일일 카운터: 2일 후 만료
const MINUTE_TTL_MS = 60 * 60 * 1000; // 분 카운터: 1시간 후 만료

// KST(UTC+9). 서버 타임존과 무관하게 한국 자정 기준으로 일일 창을 끊는다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** now 를 KST 로 옮긴 뒤 "YYYY-MM-DD" 일자 키를 만든다(자정 리셋 경계). */
export function kstDayKey(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** now 를 KST 로 옮긴 뒤 "YYYY-MM-DDTHH:mm" 분 키를 만든다(버스트 창). */
export function kstMinuteKey(now: Date): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);
}

export type RateLimitReason = "DAILY" | "BURST";
export interface RateLimitResult {
  allowed: boolean;
  reason?: RateLimitReason;
}

/**
 * 순수 판정 로직: 증가 후 카운트가 상한을 넘으면 차단한다.
 * 일일 상한을 버스트보다 먼저 판정한다(일일 초과는 "내일" 까지의 더 긴 차단이라 우선).
 * 단위 테스트 대상.
 */
export function evaluateRateLimit(dailyCount: number, minuteCount: number): RateLimitResult {
  if (dailyCount > DAILY_LIMIT) return { allowed: false, reason: "DAILY" };
  if (minuteCount > BURST_LIMIT) return { allowed: false, reason: "BURST" };
  return { allowed: true };
}

/**
 * 이번 호출을 uid 의 일일/분 카운터에 원자적으로 1 증가시키고 상한 초과 여부를 반환한다.
 * 트랜잭션으로 read-after-increment 를 보장한다(동일 uid 동시 호출의 경합 안전).
 * Firestore 오류 시 fail-open(통과)하고 로깅만 한다 - 비용의 하드 백스톱은 Anthropic spend limit.
 */
export async function checkRateLimit(uid: string, now: Date = new Date()): Promise<RateLimitResult> {
  const dayKey = kstDayKey(now);
  const minuteKey = kstMinuteKey(now);
  const db = getFirestore();
  const dayRef = db.collection(COUNTER_COLLECTION).doc(`${uid}_d_${dayKey}`);
  const minRef = db.collection(COUNTER_COLLECTION).doc(`${uid}_m_${minuteKey}`);

  try {
    const counts = await db.runTransaction(async (tx) => {
      const [daySnap, minSnap] = await Promise.all([tx.get(dayRef), tx.get(minRef)]);
      const dailyCount = ((daySnap.data()?.count as number | undefined) ?? 0) + 1;
      const minuteCount = ((minSnap.data()?.count as number | undefined) ?? 0) + 1;
      tx.set(
        dayRef,
        {
          uid,
          windowKey: dayKey,
          count: FieldValue.increment(1),
          expireAt: Timestamp.fromMillis(now.getTime() + DAY_TTL_MS),
        },
        { merge: true },
      );
      tx.set(
        minRef,
        {
          uid,
          windowKey: minuteKey,
          count: FieldValue.increment(1),
          expireAt: Timestamp.fromMillis(now.getTime() + MINUTE_TTL_MS),
        },
        { merge: true },
      );
      return { dailyCount, minuteCount };
    });
    return evaluateRateLimit(counts.dailyCount, counts.minuteCount);
  } catch (e) {
    logger.error("checkRateLimit failed, failing open", e);
    return { allowed: true };
  }
}

/** 차단 사유별 사용자 노출 메시지. */
export function rateLimitMessage(reason: RateLimitReason): string {
  return reason === "BURST"
    ? "요청이 너무 빠릅니다. 잠시 후 다시 시도해 주세요."
    : "오늘 사용량 한도에 도달했어요. 내일 다시 이용해 주세요.";
}
