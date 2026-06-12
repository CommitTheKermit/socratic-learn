import { Fragment } from "react";
import { parseSegments, renderMath } from "./mathSegments";

/**
 * 수식 전용(math-only) 텍스트 렌더러.
 *
 * - $...$ (인라인 수식) → KaTeX 인라인 렌더
 * - $$...$$ (블록 수식) → KaTeX 블록 렌더
 * - 그 외 텍스트는 마크다운 해석 없이 plain text 로 출력한다.
 *   (**bold**, *italic*, `code` 등은 문자 그대로 표시됨)
 *
 * 재사용: parseSegments/renderMath 는 src/lib/mathSegments.ts 에서만 가져온다.
 */
export function MathText({ text }: { text: string }) {
  return (
    <>
      {parseSegments(text).map((seg, i) => {
        if (seg.type === "plain") {
          return <Fragment key={i}>{seg.text}</Fragment>;
        }
        const html = renderMath(seg.latex, seg.type === "blockMath");
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </>
  );
}
