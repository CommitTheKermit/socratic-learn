import { describe, test, expect, beforeEach } from "vitest";
import { loadWhatsNewSeen, hasUnseenWhatsNew, markWhatsNewSeen } from "./whatsnewSeen";
import { LATEST_VERSION } from "../components/whatsnew/changelog";

const SEEN_KEY = "socratic:ui:whatsnewSeenVersion";

beforeEach(() => {
  localStorage.clear();
});

describe("whatsnewSeen - 업데이트 소식 마지막 본 버전", () => {
  test("아무것도 저장 안 됐으면 loadWhatsNewSeen 은 null", () => {
    expect(loadWhatsNewSeen()).toBeNull();
  });

  test("한 번도 안 봤으면 hasUnseenWhatsNew 는 true (빨간 점 노출)", () => {
    expect(hasUnseenWhatsNew()).toBe(true);
  });

  test("markWhatsNewSeen 은 현재 최신 버전을 기록한다", () => {
    markWhatsNewSeen();
    expect(loadWhatsNewSeen()).toBe(LATEST_VERSION);
  });

  test("최신 버전을 본 뒤에는 hasUnseenWhatsNew 가 false (빨간 점 소멸)", () => {
    markWhatsNewSeen();
    expect(hasUnseenWhatsNew()).toBe(false);
  });

  test("본 버전이 최신과 다르면(그 사이 새 버전 배포) 다시 true", () => {
    localStorage.setItem(SEEN_KEY, "0.0.0-old");
    expect(hasUnseenWhatsNew()).toBe(true);
  });

  test("기록은 localStorage 에 남아 다음 로드에서도 유지된다", () => {
    markWhatsNewSeen();
    // 새로고침을 모사: 모듈 상태가 아니라 localStorage 가 출처이므로 그대로 읽힌다.
    expect(loadWhatsNewSeen()).toBe(LATEST_VERSION);
    expect(hasUnseenWhatsNew()).toBe(false);
  });
});
