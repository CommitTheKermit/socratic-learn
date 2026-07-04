/**
 * 메인 화면 "Socratic은 이렇게 학습해요" 안내(HOW_STEPS)의 접기/펼침 설정 영속화.
 *
 * Hero 는 세션/단계 이동으로 재마운트되므로, 이 값을 localStorage 에 두고 마운트마다 읽어
 * 사용자가 정한 접기/펼침 상태를 유지한다(재마운트/새로고침에도 보존).
 *
 * 저장값이 없는 최초 사용자는 펼친 상태를 기본으로 한다.
 */
const GUIDE_OPEN_KEY = "socratic:ui:guideOpen";

export function loadGuideOpen(): boolean {
  try {
    // 저장값이 없는 최초 사용자는 펼침이 기본이다.
    // 사용자가 명시적으로 접은 경우("0")만 닫힘으로 본다.
    return localStorage.getItem(GUIDE_OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveGuideOpen(open: boolean): void {
  try {
    localStorage.setItem(GUIDE_OPEN_KEY, open ? "1" : "0");
  } catch {
    // 저장 실패(용량 초과 등)는 무시한다. 설정은 다음 변경에서 다시 시도된다.
  }
}
