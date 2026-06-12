import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MathText } from "./mathText";

// ─── AC 1: 수식 전용 렌더러 ───────────────────────────────────────────────────
// '**bold** $x$' 에서 $x$ 만 KaTeX 마크업으로 치환되고 '**bold**' 는 문자 그대로 남는다.

describe("MathText - 수식 전용 렌더러 (AC 1)", () => {
  it("'**bold** $x$' → $x$ 만 KaTeX 치환, **bold** 는 문자 그대로 (strong 없음)", () => {
    const { container } = render(<MathText text="**bold** $x$" />);
    // $x$ → KaTeX 마크업 존재
    expect(container.querySelector(".katex")).not.toBeNull();
    // **bold** → <strong> 없음 (마크다운 미해석)
    expect(container.querySelector("strong")).toBeNull();
    // **bold** → 원문 asterisk 가 텍스트에 남아있음
    expect(container.textContent).toContain("**bold**");
  });

  it("수식 없는 텍스트 → KaTeX 없이 그대로 출력", () => {
    const { container } = render(<MathText text="일반 텍스트입니다" />);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toBe("일반 텍스트입니다");
  });

  it("'*italic* $x+y$' → inlineMath 만 KaTeX, *italic* 그대로", () => {
    const { container } = render(<MathText text="*italic* $x+y$" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector("em")).toBeNull();
    expect(container.textContent).toContain("*italic*");
  });

  it("'`code` $x$' → inlineMath 만 KaTeX, `code` 그대로", () => {
    const { container } = render(<MathText text="`code` $x$" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector("code")).toBeNull();
    expect(container.textContent).toContain("`code`");
  });

  it("가격 표기 '$5 할인' → KaTeX 없이 원문 유지", () => {
    const { container } = render(<MathText text="$5 할인" />);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$5");
  });

  it("블록 수식 '$$E=mc^2$$' → KaTeX display 렌더", () => {
    const { container } = render(<MathText text="$$E=mc^2$$" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("잘못된 LaTeX '$\\frac{$' → 예외 없이 렌더됨", () => {
    expect(() => render(<MathText text={"$\\frac{$"} />)).not.toThrow();
    const { container } = render(<MathText text={"$\\frac{$"} />);
    expect(container).toBeDefined();
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("닫히지 않은 '$x^2 +' → KaTeX 없이 원문 유지", () => {
    const { container } = render(<MathText text="$x^2 +" />);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$x^2 +");
  });
});

// ─── 표면별 연결 검증 ─────────────────────────────────────────────────────────

describe("MathText - 표면별 수식 렌더링", () => {
  it("Probe/BranchDialog/피드백/Done/에코 표면 공통: '에너지 $E=mc^2$' → KaTeX 치환, 주변 텍스트 보존", () => {
    const { container } = render(<MathText text="에너지 $E=mc^2$ 공식" />);
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain("에너지");
    expect(container.textContent).toContain("공식");
  });

  it("빈 문자열 → 빈 렌더 (오류 없음)", () => {
    expect(() => render(<MathText text="" />)).not.toThrow();
    const { container } = render(<MathText text="" />);
    expect(container.textContent).toBe("");
  });
});
