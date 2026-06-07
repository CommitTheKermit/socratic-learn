/**
 * 탭 수명 동안 sessionId별 원격 동기화(fetchAndMerge) 완료 상태를 관리한다.
 *
 * - 모듈 스코프 Map: AppShell key=sessionId 재마운트에도 살아남는다.
 * - 브라우저 새로고침(F5) 시 모듈 재로드로 초기화 - 다음 진입에서 1회 재fetch.
 * - fetch 성공 시에만 markSynced 호출(실패는 등록 안 해 다음 진입에 재시도).
 */

const registry = new Map<string, boolean>();

/**
 * sessionId 에 대해 fetchAndMerge 가 이미 성공했는지 확인한다.
 */
export function hasSynced(sessionId: string): boolean {
  return registry.get(sessionId) === true;
}

/**
 * sessionId 에 대해 fetchAndMerge 가 성공적으로 완료됐음을 기록한다.
 * 이후 hasSynced(sessionId) 가 true 를 반환한다.
 */
export function markSynced(sessionId: string): void {
  registry.set(sessionId, true);
}

/**
 * 테스트 전용: 레지스트리를 초기화한다.
 * 프로덕션 코드에서는 호출하지 말 것.
 */
export function _resetForTest(): void {
  registry.clear();
}
