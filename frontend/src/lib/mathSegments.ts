import katex from "katex";

export type MathSegment =
  | { type: "plain"; text: string }
  | { type: "inlineMath"; latex: string }
  | { type: "blockMath"; latex: string };

/**
 * 텍스트를 plain/inlineMath/blockMath 세그먼트로 분할한다.
 *
 * 규칙:
 * - $$...$$ → blockMath (닫힌 경우만, 미완성 시 plain 유지)
 * - $...$ → inlineMath (닫힌 경우만, 줄바꿈 불포함)
 * - 열기 $ 바로 뒤에 숫자가 오면 수식 델리미터로 해석하지 않음 (예: $5 → plain)
 * - 닫히지 않은 델리미터 → plain 유지 (스트리밍 안전)
 */
export function parseSegments(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let i = 0;
  let plainStart = 0;

  const pushPlain = (end: number) => {
    if (end > plainStart) {
      segments.push({ type: "plain", text: text.slice(plainStart, end) });
    }
  };

  while (i < text.length) {
    if (text[i] !== "$") {
      i++;
      continue;
    }

    // $$ block math 우선 시도
    if (i + 1 < text.length && text[i + 1] === "$") {
      const closeIdx = text.indexOf("$$", i + 2);
      if (closeIdx !== -1) {
        pushPlain(i);
        segments.push({ type: "blockMath", latex: text.slice(i + 2, closeIdx).trim() });
        plainStart = closeIdx + 2;
        i = plainStart;
      } else {
        // 닫히지 않은 $$ - plain 유지 (스트리밍 중간 상태)
        i += 2;
      }
      continue;
    }

    // $ inline math
    // 가격 표기 방지: 열기 $ 바로 뒤에 숫자가 오면 수식 델리미터로 해석하지 않음
    const afterDollar = i + 1 < text.length ? text[i + 1] : "";
    if (!afterDollar || /\d/.test(afterDollar)) {
      i++;
      continue;
    }

    // 닫기 $ 탐색 - 인라인이므로 줄바꿈은 경계로 처리
    let j = i + 1;
    while (j < text.length && text[j] !== "$" && text[j] !== "\n") {
      j++;
    }

    if (j < text.length && text[j] === "$" && j > i + 1) {
      // 내용이 있는 유효한 인라인 수식
      pushPlain(i);
      segments.push({ type: "inlineMath", latex: text.slice(i + 1, j) });
      plainStart = j + 1;
      i = plainStart;
    } else {
      // 유효한 닫기 $ 없음 - plain 유지 (스트리밍 중간 상태 또는 가격 표기)
      i++;
    }
  }

  pushPlain(text.length);
  return segments;
}

/**
 * KaTeX 로 LaTeX 수식을 렌더링한다.
 * throwOnError 비활성화: 파싱 오류 시 KaTeX 오류 토큰을 반환(예외 없음).
 * 예외 발생 시 원문 반환 (최후 안전망).
 */
export function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      displayMode,
    });
  } catch {
    return displayMode ? `$$${latex}$$` : `$${latex}$`;
  }
}
