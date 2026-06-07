/**
 * sessionDelete 단위 테스트.
 *
 * onRequest 핸들러를 직접 추출해 mock req/res 로 구동한다.
 * firebase-admin/firestore, firebase-functions/v2/https, ./auth 는 vi.mock 으로 격리한다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mock 선언은 최상단에 위치해야 한다(hoisting) ──────────────────────────

/** onRequest 가 받은 핸들러를 그대로 반환해 테스트가 직접 호출할 수 있게 한다. */
vi.mock("firebase-functions/v2/https", () => ({
  onRequest: (_opts: unknown, handler: unknown) => handler,
}));

vi.mock("firebase-functions/logger", () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

/** getFirestore() 반환값을 vitest spy 로 제어한다. */
const mockDelete = vi.fn();
const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, delete: mockDelete }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockItemsCol = vi.fn(() => ({ doc: mockDoc }));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (uid: string) => ({
        collection: (_sub: string) => ({
          doc: mockItemsCol(uid),  // itemsCol(uid).doc(sessionId) 흐름
        }),
      }),
    }),
  }),
}));

/** requireAuth 와 recordUsage 를 독립 mock 으로 교체한다. */
const mockRequireAuth = vi.fn<[unknown, unknown], Promise<string | null>>();
const mockRecordUsage = vi.fn();

vi.mock("../auth", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
}));

// ── 테스트 도우미 ──────────────────────────────────────────────────────────

type JsonFn = (body: unknown) => MockRes;
interface MockRes {
  _status: number;
  _body: unknown;
  status: (code: number) => MockRes;
  json: JsonFn;
}

function makeRes(): MockRes {
  const res: MockRes = {
    _status: 200,
    _body: undefined,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._body = body;
      return this;
    },
  };
  return res;
}

function makeReq(body: unknown, method = "POST") {
  return { method, headers: { authorization: "Bearer valid-token" }, body };
}

// ── 테스트 본문 ──────────────────────────────────────────────────────────

describe("sessionDelete handler", () => {
  // handler 는 onRequest mock 덕에 함수 자체가 된다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handler: (req: any, res: any) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // 모듈을 매 테스트마다 새로 가져와 mock 상태 반영
    vi.resetModules();
    // mock 재등록(resetModules 후 다시 hoisting 이 필요)
    vi.mock("firebase-functions/v2/https", () => ({
      onRequest: (_opts: unknown, h: unknown) => h,
    }));
    vi.mock("firebase-functions/logger", () => ({
      error: vi.fn(),
      warn: vi.fn(),
    }));
    vi.mock("firebase-admin/firestore", () => ({
      getFirestore: () => ({
        collection: (_name: string) => ({
          doc: (_uid: string) => ({
            collection: (_sub: string) => ({
              doc: (_sid: string) => ({ get: mockGet, delete: mockDelete }),
            }),
          }),
        }),
      }),
    }));
    vi.mock("../auth", () => ({
      requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
      recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
    }));

    const mod = await import("../sessionDelete");
    // onRequest mock 이 handler 를 그대로 반환하므로 mod.sessionDelete 가 handler 다
    handler = mod.sessionDelete as unknown as typeof handler;
  });

  // ── 405 ──────────────────────────────────────────────────────────────────
  it("POST 이외의 메서드는 405 를 반환한다", async () => {
    const req = makeReq({}, "GET");
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  // ── 401 ──────────────────────────────────────────────────────────────────
  it("requireAuth 가 null 을 반환하면(인증 실패) 처리를 중단한다", async () => {
    mockRequireAuth.mockResolvedValue(null);
    const req = makeReq({ sessionId: "s1" });
    const res = makeRes();
    await handler(req, res);
    // requireAuth 가 이미 res.status(401).json() 을 호출했으므로 핸들러는 return 한다
    expect(mockGet).not.toHaveBeenCalled();
  });

  // ── 400 ──────────────────────────────────────────────────────────────────
  it("sessionId 누락 시 400 을 반환한다", async () => {
    mockRequireAuth.mockResolvedValue("uid-alice");
    const req = makeReq({});
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("sessionId 가 빈 문자열이면 400 을 반환한다", async () => {
    mockRequireAuth.mockResolvedValue("uid-alice");
    const req = makeReq({ sessionId: "" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  // ── 403(타 uid 세션 삭제 시도) ────────────────────────────────────────────
  it("인증된 uid 의 컬렉션에 해당 sessionId 가 없으면 403 을 반환한다(타 uid 세션 포함)", async () => {
    mockRequireAuth.mockResolvedValue("uid-alice");
    // uid-alice 의 컬렉션에 sessionId 가 없음(exists=false) - uid-bob 소유 세션 시뮬레이션
    mockGet.mockResolvedValue({ exists: false });
    const req = makeReq({ sessionId: "session-of-bob" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect((res._body as { code?: string })?.code).toBe("FORBIDDEN");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  // ── 200(정상 삭제) ────────────────────────────────────────────────────────
  it("uid 소유 세션이면 Firestore 에서 삭제하고 ok:true 를 반환한다", async () => {
    mockRequireAuth.mockResolvedValue("uid-alice");
    mockGet.mockResolvedValue({ exists: true });
    mockDelete.mockResolvedValue(undefined);
    const req = makeReq({ sessionId: "session-alice" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect((res._body as { ok?: boolean })?.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("삭제 성공 시 recordUsage 를 호출한다", async () => {
    mockRequireAuth.mockResolvedValue("uid-alice");
    mockGet.mockResolvedValue({ exists: true });
    mockDelete.mockResolvedValue(undefined);
    const req = makeReq({ sessionId: "session-alice" });
    const res = makeRes();
    await handler(req, res);
    expect(mockRecordUsage).toHaveBeenCalledWith("uid-alice", "sessionDelete");
  });

  // ── 500(Firestore 오류) ───────────────────────────────────────────────────
  it("Firestore get 오류 시 500 을 반환한다", async () => {
    mockRequireAuth.mockResolvedValue("uid-alice");
    mockGet.mockRejectedValue(new Error("firestore unavailable"));
    const req = makeReq({ sessionId: "session-alice" });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(500);
  });
});
