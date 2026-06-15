/**
 * normalizeStepTitle - 단계 제목 정규화 순수 함수
 *
 * 중복 감지(isMerged), 번호 라벨, 브레드크럼 비교 시
 * 공통으로 사용하는 백스톱 비교 키를 만든다.
 *
 * 변환 순서:
 *  1. trim           - 앞뒤 공백 제거
 *  2. 소문자화        - 대소문자 무관 비교
 *  3. 내부 공백 단일화 - 연속 공백 -> 단일 공백
 *  4. 부제 제거       - 첫 구분자(콜론 또는 공백으로 감싼 하이픈) 이후 제거
 */
export function normalizeStepTitle(title: string): string {
  // 1. trim
  let s = title.trim();

  // 2. 소문자화
  s = s.toLowerCase();

  // 3. 내부 연속 공백 -> 단일 공백
  s = s.replace(/\s+/g, " ");

  // 4. 첫 구분자(콜론 또는 공백 감싼 하이픈) 이후 부제 제거
  //    - \s*:\s* : 콜론 (앞뒤 공백 포함)
  //    - \s+-\s+ : 공백으로 둘러싼 하이픈 (복합어 하이픈은 보존)
  const delimIdx = s.search(/\s*:\s*|\s+-\s+/);
  if (delimIdx !== -1) {
    s = s.slice(0, delimIdx).trim();
  }

  return s;
}
