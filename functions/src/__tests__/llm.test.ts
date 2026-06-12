import { describe, it, expect } from "vitest";
import { isCodexEnabled } from "../llm";

// codex 경로는 emulator + LLM_PROVIDER=codex 둘 다 충족할 때만 켜져야 한다.
// 실배포(FUNCTIONS_EMULATOR 없음)에서는 어떤 경우에도 켜지면 안 된다.
describe("isCodexEnabled", () => {
  it("emulator + LLM_PROVIDER=codex 이면 true", () => {
    expect(isCodexEnabled({ FUNCTIONS_EMULATOR: "true", LLM_PROVIDER: "codex" })).toBe(true);
  });

  it("emulator 라도 LLM_PROVIDER 가 없으면 false", () => {
    expect(isCodexEnabled({ FUNCTIONS_EMULATOR: "true" })).toBe(false);
  });

  it("LLM_PROVIDER=codex 라도 emulator 가 아니면 false (실배포 가드)", () => {
    expect(isCodexEnabled({ LLM_PROVIDER: "codex" })).toBe(false);
  });

  it("둘 다 없으면 false", () => {
    expect(isCodexEnabled({})).toBe(false);
  });
});
