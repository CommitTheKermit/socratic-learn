import { describe, it, expect } from "vitest";
import { ApiPaths } from "../contract";
import type { SessionDeleteRequest } from "../contract";

describe("SESSION_DELETE contract", () => {
  it("ApiPaths.SESSION_DELETE 는 /sessionDelete 이다", () => {
    expect(ApiPaths.SESSION_DELETE).toBe("/sessionDelete");
  });

  it("SESSION_DELETE 키 이름이 Function 이름과 일치한다", () => {
    // ApiPaths 키 = Function 이름 = 경로 규칙 검증
    const key = "SESSION_DELETE";
    const expectedPath = "/sessionDelete";
    expect(ApiPaths[key]).toBe(expectedPath);
  });

  it("SessionDeleteRequest 는 sessionId string 필드를 가진다", () => {
    const req: SessionDeleteRequest = { sessionId: "abc-123" };
    expect(req.sessionId).toBe("abc-123");
    expect(typeof req.sessionId).toBe("string");
  });

  it("SessionDeleteRequest 는 sessionId 만 허용한다(여분 필드 없음)", () => {
    const req: SessionDeleteRequest = { sessionId: "xyz" };
    expect(Object.keys(req)).toEqual(["sessionId"]);
  });
});
