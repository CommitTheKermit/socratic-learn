/**
 * rateLimit 순수 로직 단위 테스트.
 *
 * Firestore IO(checkRateLimit)는 검증 대상이 아니다. KST 창 키 계산과 상한 판정만 본다.
 * 모듈 최상단의 admin 초기화/Firestore import 가 node 환경에서 터지지 않도록 mock 으로 격리한다.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("firebase-admin/app", () => ({
  getApps: () => [{}], // 비어있지 않게 해 initializeApp 을 건너뛴다
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
  Timestamp: { fromMillis: (ms: number) => ({ __millis: ms }) },
}));

vi.mock("firebase-functions/logger", () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

import {
  kstDayKey,
  kstMinuteKey,
  evaluateRateLimit,
  DAILY_LIMIT,
  BURST_LIMIT,
} from "../rateLimit";

describe("kstDayKey (KST 자정 리셋 경계)", () => {
  it("KST 23:59 와 다음날 00:00 은 다른 일자 키를 만든다(자정 리셋)", () => {
    // 2026-06-11T14:59Z = KST 2026-06-11 23:59, 2026-06-11T15:00Z = KST 2026-06-12 00:00
    expect(kstDayKey(new Date("2026-06-11T14:59:00Z"))).toBe("2026-06-11");
    expect(kstDayKey(new Date("2026-06-11T15:00:00Z"))).toBe("2026-06-12");
  });

  it("같은 KST 일자 안에서는 시간이 달라도 같은 키다", () => {
    expect(kstDayKey(new Date("2026-06-11T15:00:00Z"))).toBe("2026-06-12");
    expect(kstDayKey(new Date("2026-06-12T14:00:00Z"))).toBe("2026-06-12");
  });
});

describe("kstMinuteKey (분 버스트 창)", () => {
  it("KST 분 단위 키를 만든다", () => {
    expect(kstMinuteKey(new Date("2026-06-11T15:00:30Z"))).toBe("2026-06-12T00:00");
  });

  it("같은 분 안의 다른 초는 같은 분 키, 다음 분은 다른 키다", () => {
    expect(kstMinuteKey(new Date("2026-06-11T15:00:05Z"))).toBe("2026-06-12T00:00");
    expect(kstMinuteKey(new Date("2026-06-11T15:00:59Z"))).toBe("2026-06-12T00:00");
    expect(kstMinuteKey(new Date("2026-06-11T15:01:00Z"))).toBe("2026-06-12T00:01");
  });
});

describe("evaluateRateLimit (상한 판정)", () => {
  it("상한 이하면 통과한다", () => {
    expect(evaluateRateLimit(1, 1)).toEqual({ allowed: true });
  });

  it("정확히 상한값이면 아직 통과한다(초과가 아니라 도달)", () => {
    expect(evaluateRateLimit(DAILY_LIMIT, BURST_LIMIT)).toEqual({ allowed: true });
  });

  it("일일 상한 초과(151)는 DAILY 로 차단한다", () => {
    expect(evaluateRateLimit(DAILY_LIMIT + 1, 1)).toEqual({ allowed: false, reason: "DAILY" });
  });

  it("분당 상한 초과(21)는 BURST 로 차단한다", () => {
    expect(evaluateRateLimit(1, BURST_LIMIT + 1)).toEqual({ allowed: false, reason: "BURST" });
  });

  it("일일·버스트 둘 다 초과면 DAILY 가 우선한다(더 긴 차단)", () => {
    expect(evaluateRateLimit(DAILY_LIMIT + 1, BURST_LIMIT + 1)).toEqual({
      allowed: false,
      reason: "DAILY",
    });
  });
});
