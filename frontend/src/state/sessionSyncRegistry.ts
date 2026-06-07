/**
 * 탭 수명 동안 fetchAndMerge 가 성공한 sessionId 집합(메모리 내 Set).
 * AppShell key=sessionId 재마운트에도 살아남도록 모듈 스코프에 둔다.
 * 브라우저 새로고침(F5) 시 모듈 재로드로 초기화 - 다음 진입에 1회 재fetch.
 */
const _completed = new Set<string>();

/** sessionId 를 fetch 완료로 기록한다. */
export function markComplete(sessionId: string): void {
  _completed.add(sessionId);
}

/** sessionId 가 이번 탭 수명에서 이미 fetch 완료됐는지 반환한다. */
export function isComplete(sessionId: string): boolean {
  return _completed.has(sessionId);
}
