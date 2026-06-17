/**
 * 학습 단계 레이아웃 방향(세로/가로) 설정의 영속화.
 *
 * Learn 은 단계 이동/세션 전환 시 재마운트되므로, 사용자가 고른 방향을 localStorage 에
 * 두고 마운트마다 읽어 단계/세션이 같은 설정 하나를 따르도록(공유) 한다.
 *
 * 저장값이 없는 최초 사용자는 세로(vertical)를 기본으로 한다.
 */
const ORIENT_KEY = "socratic:ui:learnOrient";

export type Orient = "vertical" | "horizontal";

export function loadOrient(): Orient {
  try {
    return localStorage.getItem(ORIENT_KEY) === "horizontal" ? "horizontal" : "vertical";
  } catch {
    return "vertical";
  }
}

export function saveOrient(orient: Orient): void {
  try {
    localStorage.setItem(ORIENT_KEY, orient);
  } catch {
    // 저장 실패(용량 초과 등)는 무시한다. 설정은 다음 변경에서 다시 시도된다.
  }
}
