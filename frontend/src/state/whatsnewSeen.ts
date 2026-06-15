/**
 * 업데이트 소식(What's New) "마지막으로 본 버전"의 영속화.
 *
 * 사이드바 "업데이트" 항목의 빨간 점은 "사용자가 아직 못 본 새 버전이 있을 때만" 표시한다.
 * 마지막으로 패널을 연 시점의 최신 버전을 localStorage 에 저장해 두고, 현재 최신 버전과
 * 다르면(= 그 사이 새 버전이 나왔으면) 점을 띄운다.
 *
 * AppWorkspace 는 단계 이동/세션 전환 시 재마운트되므로, 이 값을 localStorage 에 두고
 * 마운트마다 읽어 모든 단계가 같은 상태를 공유하게 한다.
 */
import { LATEST_VERSION } from "../components/whatsnew/changelog";

const SEEN_KEY = "socratic:ui:whatsnewSeenVersion";

/** 마지막으로 본 버전 문자열(없으면 null). */
export function loadWhatsNewSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/** 아직 안 본 새 버전이 있으면 true(= 빨간 점 노출). */
export function hasUnseenWhatsNew(): boolean {
  if (!LATEST_VERSION) return false;
  return loadWhatsNewSeen() !== LATEST_VERSION;
}

/** 현재 최신 버전을 "봤음"으로 기록한다(패널을 열 때 호출). */
export function markWhatsNewSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_VERSION);
  } catch {
    // 저장 실패(용량 초과 등)는 무시한다. 다음 열람에서 다시 시도된다.
  }
}
