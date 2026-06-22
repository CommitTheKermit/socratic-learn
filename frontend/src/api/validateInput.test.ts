/**
 * validateInput 클라이언트 단위 테스트.
 * - 성공 응답 { valid } 를 boolean 으로 반환한다(valid=true/false 분기).
 * - 응답이 !ok 면 서버 { code, message } 를 ClaudeContentError 로 변환해 throw 한다.
 * - 요청은 POST /validateInput + body { text } 로 나간다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { validateInput, ClaudeContentError } from "./claudeContent";
import { ApiPaths } from "./contract";

// 인증 헤더는 firebase auth 의존이라 단위 테스트에선 stub.
vi.mock("./authHeaders", () => ({
  authHeaders: vi.fn(async () => ({ "Content-Type": "application/json" })),
}));

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOnce(init: { ok: boolean; status?: number; json: unknown }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 400),
    json: async () => init.json,
  } as Response);
}

describe("validateInput 클라이언트", () => {
  test("valid=true 면 true 를 반환하고 POST /validateInput + { text } 로 호출한다", async () => {
    const spy = mockFetchOnce({ ok: true, json: { valid: true } });
    const result = await validateInput("미분");
    expect(result).toBe(true);

    const [url, opts] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(ApiPaths.VALIDATE_INPUT);
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({ text: "미분" });
  });

  test("valid=false 면 false 를 반환한다(부적합 분기)", async () => {
    mockFetchOnce({ ok: true, json: { valid: false } });
    const result = await validateInput("asdfasdf");
    expect(result).toBe(false);
  });

  test("응답이 !ok 면 서버 code/message 로 ClaudeContentError 를 throw 한다", async () => {
    mockFetchOnce({ ok: false, status: 401, json: { code: "UNAUTHENTICATED", message: "로그인이 필요합니다." } });
    await expect(validateInput("미분")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  test("ClaudeContentError 는 code 필드를 갖는다", async () => {
    mockFetchOnce({ ok: false, status: 500, json: { code: "CLAUDE_API_ERROR", message: "x" } });
    const err = await validateInput("미분").catch((e) => e);
    expect(err).toBeInstanceOf(ClaudeContentError);
    expect((err as ClaudeContentError).code).toBe("CLAUDE_API_ERROR");
  });
});
