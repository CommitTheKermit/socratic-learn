import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), detect: vi.fn(), transaction: vi.fn(), getAll: vi.fn(), set: vi.fn() }));
vi.mock("firebase-functions/v2/https", () => ({ onRequest: (_: unknown, handler: unknown) => handler }));
vi.mock("firebase-functions/logger", () => ({ error: vi.fn() }));
vi.mock("../auth", () => ({ requireAuth: mocks.auth }));
vi.mock("firebase-admin/app", () => ({ getApps: () => [{}] }));
vi.mock("@google-cloud/vision", () => ({ ImageAnnotatorClient: class { batchAnnotateImages = mocks.detect; } }));
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({ collection: () => ({ doc: (id: string) => id }), runTransaction: mocks.transaction }),
  Timestamp: { fromMillis: (n: number) => n },
}));
import { answerOcr, decodeOcrImage, reserveOcrUsage } from "../answerOcr";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]).toString("base64");
async function invoke(body: unknown = { imageBase64: jpeg }, method = "POST") {
  const res = { set: vi.fn(), status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  await (answerOcr as unknown as (req: unknown, res: unknown) => Promise<void>)({ method, body }, res);
  return res;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("OCR_DAILY_LIMIT", "20");
  vi.stubEnv("OCR_MONTHLY_LIMIT", "10000");
  mocks.auth.mockResolvedValue("student");
  mocks.getAll.mockResolvedValue([0, 0, 0].map((count) => ({ data: () => ({ count }) })));
  mocks.transaction.mockImplementation((fn) => fn({ getAll: mocks.getAll, set: mocks.set }));
  mocks.detect.mockResolvedValue([{ responses: [{ fullTextAnnotation: { text: "  답변 x² = 4\n" } }] }]);
});
afterEach(() => vi.unstubAllEnvs());

it("JPEG 이외 형식, 잘못된 base64, 큰 입력을 OCR 전에 거절한다", async () => {
  for (const body of [null, {}, { imageBase64: 42 }, { imageBase64: "!!!!" }, { imageBase64: "aGVsbG8=" }, { imageBase64: "A".repeat(2800000) }]) {
    expect(decodeOcrImage(body)).toBeNull();
    expect((await invoke(body)).status).toHaveBeenCalledWith(400);
  }
  expect(mocks.detect).not.toHaveBeenCalled();
});
it("인증 실패와 다른 HTTP 메서드는 과금 경로에 진입하지 않는다", async () => {
  expect((await invoke({}, "GET")).status).toHaveBeenCalledWith(405);
  mocks.auth.mockResolvedValue(null);
  await invoke();
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.detect).not.toHaveBeenCalled();
});
it("KST 월 경계로 한도를 예약하고 사진은 저장하지 않는다", async () => {
  await reserveOcrUsage("student", new Date("2026-09-30T15:00:00Z"));
  expect(mocks.getAll).toHaveBeenCalledWith("user_student_2026-10-01", "burst_student_2026-10-01T00:00", "total_2026-10");
  expect(mocks.set).toHaveBeenCalledTimes(3);
  expect(mocks.set.mock.calls[0][1]).toEqual({ count: 1, expireAt: expect.any(Number) });
});
it("사용자 일일/분당/전체 월 한도와 손상된 카운터에서 차단한다", async () => {
  for (const counts of [[20, 0, 0], [0, 5, 0], [0, 0, 10000], ["bad", 0, 0]]) {
    mocks.getAll.mockResolvedValue(counts.map((count) => ({ data: () => ({ count }) })));
    expect((await invoke()).status).toHaveBeenCalledWith(429);
  }
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.detect).not.toHaveBeenCalled();
});
it("사용량 저장 장애는 fail-closed로 OCR 호출을 차단한다", async () => {
  mocks.transaction.mockRejectedValueOnce(new Error("Firestore unavailable"));
  expect((await invoke()).status).toHaveBeenCalledWith(503);
  expect(mocks.detect).not.toHaveBeenCalled();
});
it("OCR은 자동 재시도 없이 한 번만 호출하고 텍스트만 반환한다", async () => {
  const res = await invoke();
  expect(mocks.detect).toHaveBeenCalledWith({ requests: [{ image: { content: Buffer.from(jpeg, "base64") }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }] }] }, { timeout: 25000, retry: null });
  expect(res.json).toHaveBeenCalledWith({ text: "답변 x² = 4" });
  expect(res.set).toHaveBeenCalledWith("Cache-Control", "no-store");
});
it("Vision 오류를 이미지나 내부 오류 내용 없이 반환한다", async () => {
  mocks.detect.mockResolvedValueOnce([{ responses: [{ error: { code: 7, message: "private" } }] }]);
  const res = await invoke();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(JSON.stringify(res.json.mock.calls)).not.toContain("private");
});
