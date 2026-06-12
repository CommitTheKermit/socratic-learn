import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { parseSegments, renderMath } from "./mathSegments";
import { Markdown } from "./markdown";

// ─── parseSegments 단위 테스트 ───────────────────────────────────────────────

describe("parseSegments - 인라인 수식", () => {
  it("에너지는 $E=mc^2$ 이다 → plain / inlineMath / plain 3 세그먼트", () => {
    const segs = parseSegments("에너지는 $E=mc^2$ 이다");
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ type: "plain", text: "에너지는 " });
    expect(segs[1]).toEqual({ type: "inlineMath", latex: "E=mc^2" });
    expect(segs[2]).toEqual({ type: "plain", text: " 이다" });
  });

  it("수식이 없는 텍스트 → plain 1개", () => {
    const segs = parseSegments("일반 텍스트");
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: "plain", text: "일반 텍스트" });
  });

  it("연속 인라인 수식 $a$ 와 $b$", () => {
    const segs = parseSegments("$a$ 와 $b$");
    expect(segs.filter((s) => s.type === "inlineMath")).toHaveLength(2);
    const maths = segs.filter((s) => s.type === "inlineMath");
    expect(maths[0]).toEqual({ type: "inlineMath", latex: "a" });
    expect(maths[1]).toEqual({ type: "inlineMath", latex: "b" });
  });
});

describe("parseSegments - 블록 수식", () => {
  it("$$E=mc^2$$ → blockMath 1개", () => {
    const segs = parseSegments("$$E=mc^2$$");
    expect(segs).toHaveLength(1);
    expect(segs[0]).toEqual({ type: "blockMath", latex: "E=mc^2" });
  });

  it("텍스트 앞뒤 블록 수식", () => {
    const segs = parseSegments("수식: $$\\alpha + \\beta$$ 끝");
    const mathSeg = segs.find((s) => s.type === "blockMath");
    expect(mathSeg).toBeDefined();
    expect((mathSeg as { type: "blockMath"; latex: string }).latex).toBe("\\alpha + \\beta");
  });
});

describe("parseSegments - 가격 표기 폴백", () => {
  it("$5 는 수식 델리미터가 아님 → plain 유지", () => {
    const segs = parseSegments("가격은 $5 이다");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
    expect((segs[0] as { type: "plain"; text: string }).text).toBe("가격은 $5 이다");
  });

  it("$100 는 수식 델리미터가 아님", () => {
    const segs = parseSegments("$100 할인");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
  });

  it("$0.99 (숫자 직후 소수점) → plain", () => {
    const segs = parseSegments("$0.99 짜리");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
  });
});

describe("parseSegments - 미완성 델리미터 폴백 (스트리밍 안전)", () => {
  it("닫히지 않은 인라인 $E=mc^2 → plain 유지", () => {
    const segs = parseSegments("에너지는 $E=mc^2");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
  });

  it("닫히지 않은 블록 $$E=mc^2 → plain 유지", () => {
    const segs = parseSegments("$$E=mc^2");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
  });

  it("단독 $ 문자 → plain 유지", () => {
    const segs = parseSegments("이건 $ 기호입니다");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("plain");
  });
});

// ─── renderMath 단위 테스트 ──────────────────────────────────────────────────

describe("renderMath", () => {
  it("유효한 수식 → .katex 클래스 포함 HTML 반환", () => {
    const html = renderMath("E=mc^2", false);
    expect(html).toContain("katex");
  });

  it("displayMode=true → 블록 렌더 HTML 반환", () => {
    const html = renderMath("E=mc^2", true);
    expect(html).toContain("katex");
  });

  it("잘못된 LaTeX → 예외 없이 결과 반환 (throwOnError: false)", () => {
    expect(() => renderMath("\\invalid{unclosed", false)).not.toThrow();
    const html = renderMath("\\invalid{unclosed", false);
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(0);
  });
});

// ─── Markdown 컴포넌트 통합 테스트 (AC 1) ────────────────────────────────────

describe("Markdown 인라인 수식 렌더링 (AC 1)", () => {
  it("'에너지는 $E=mc^2$ 이다' → .katex 마크업으로 치환, 주변 텍스트 보존", () => {
    const { container } = render(<Markdown text="에너지는 $E=mc^2$ 이다" />);

    // KaTeX 마크업이 존재해야 함
    const katexEl = container.querySelector(".katex");
    expect(katexEl).not.toBeNull();

    // 주변 텍스트 보존 확인
    const textContent = container.textContent ?? "";
    expect(textContent).toContain("에너지는");
    expect(textContent).toContain("이다");
  });

  it("$5 가격 표기 → KaTeX 렌더 없이 원문 유지", () => {
    const { container } = render(<Markdown text="가격은 $5 이다" />);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$5");
  });

  it("닫히지 않은 $E=mc^2 → 원문 텍스트 유지", () => {
    const { container } = render(<Markdown text="에너지는 $E=mc^2" />);
    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$E=mc^2");
  });

  it("블록 $$E=mc^2$$ → KaTeX display 렌더", () => {
    const { container } = render(<Markdown text="$$E=mc^2$$" />);
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("수식이 없는 텍스트 → 기존 bold/italic/code 렌더 정상", () => {
    const { container } = render(<Markdown text="**굵게** *기울기* `코드`" />);
    expect(container.querySelector("strong")).not.toBeNull();
    expect(container.querySelector("em")).not.toBeNull();
    expect(container.querySelector("code")).not.toBeNull();
    expect(container.querySelector(".katex")).toBeNull();
  });
});
