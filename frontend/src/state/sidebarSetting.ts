/**
 * 사이드바(드로워) "고정 펼침" 설정의 영속화.
 *
 * 드로워 상태 중 사용자가 명시적으로 정하는 값은 pinned(완전히 펼쳐 고정) 하나뿐이다.
 * peeking(가장자리 호버 미리보기)은 일시적이라 저장하지 않는다.
 *
 * AppWorkspace 는 단계 이동/세션 전환 시 재마운트되므로, 이 값을 localStorage 에 두고
 * 마운트마다 읽어 메인과 모든 단계가 같은 설정 하나를 따르도록(공유) 한다.
 *
 * 저장값이 없는 최초 사용자는 열린(고정) 상태를 기본으로 한다.
 */
const PINNED_KEY = "socratic:ui:sidebarPinned";

export function loadSidebarPinned(): boolean {
  try {
    // 저장된 값이 없는 최초 사용자는 열린(고정) 상태가 기본이다.
    // 사용자가 명시적으로 숨긴 경우("0")만 닫힘으로 본다.
    return localStorage.getItem(PINNED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveSidebarPinned(pinned: boolean): void {
  try {
    localStorage.setItem(PINNED_KEY, pinned ? "1" : "0");
  } catch {
    // 저장 실패(용량 초과 등)는 무시한다. 설정은 다음 변경에서 다시 시도된다.
  }
}
