/**
 * learnTree.ts - 학습 트리 탐색 순수 유틸리티
 *
 * 이 파일의 모든 함수는 부작용 없는 순수 함수다.
 * 브레드크럼, 번호 라벨, 제목 정규화 등 트리 탐색에 필요한
 * 공통 연산을 한 곳에 모아 단위 테스트로 검증한다.
 */

/**
 * normalizeTitle - 제목 정규화 순수 함수
 *
 * 변환 순서:
 * 1. trim       - 앞뒤 공백 제거
 * 2. 소문자화   - toLowerCase (영문 기준, 한글 무변화)
 * 3. 공백 단일화 - 연속 공백·탭을 단일 스페이스로
 * 4. 부제 제거   - 첫 구분자(': ' 또는 ' - ') 이후 제거
 *
 * 백스톱 제목 비교 키(isMerged 중복 판정)에 사용하므로
 * 동일 개념 제목이 구분자·대소문자·공백만 다를 때도 동일 키를 생성해야 한다.
 */
export function normalizeTitle(title: string): string {
  // 1. trim
  let s = title.trim();
  // 2. 소문자화
  s = s.toLowerCase();
  // 3. 내부 공백 단일화 (탭, 줄바꿈 포함 모든 공백을 단일 스페이스로)
  s = s.replace(/\s+/g, " ");
  // 4. 첫 구분자 뒤 부제 제거 (': ' 또는 ' - ')
  //    whitespace 정규화 완료 후 탐색하므로 단일 스페이스 기준으로 매칭
  const sepMatch = s.match(/^(.*?)(?::\s|\s-\s)/);
  if (sepMatch) {
    // match[1] 끝에 구분자 직전 공백이 남을 수 있으므로 trim
    return sepMatch[1].trim();
  }
  return s;
}
