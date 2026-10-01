import { afterEach, describe, expect, it, vi } from "vitest";
import { getLanguage, resolveLanguage, saveLanguage, LANGUAGE_STORAGE_KEY } from "./language";
import { t } from "./translate";

afterEach(() => { localStorage.removeItem(LANGUAGE_STORAGE_KEY); vi.restoreAllMocks(); });

describe("initial language and explicit preference", () => {
  it.each(["ko", "ko-KR", "ko-kp", "KO-KR"])("uses Korean for %s", (locale) => {
    expect(resolveLanguage(null, locale)).toBe("ko");
  });
  it.each(["en-US", "ja-JP", "fr", "", "kok-IN"])("uses English for %s", (locale) => {
    expect(resolveLanguage(null, locale)).toBe("en");
  });
  it("prioritizes a saved selection over the browser language", () => {
    expect(resolveLanguage("en", "ko-KR")).toBe("en");
    expect(resolveLanguage("ko", "en-US")).toBe("ko");
    expect(resolveLanguage("invalid", "ja-JP")).toBe("en");
  });
  it("persists the selection and translates application copy without changing user content", () => {
    saveLanguage("en");
    expect(getLanguage()).toBe("en");
    expect(t("학습 시작")).toBe("Start learning");
    expect(t("사용자가 작성한 원문")).toBe("사용자가 작성한 원문");
    saveLanguage("ko");
    expect(t("학습 시작")).toBe("학습 시작");
  });
  it("falls back to the browser if storage is inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(getLanguage()).toBe("ko");
  });
});
