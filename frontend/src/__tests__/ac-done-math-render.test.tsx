/**
 * Sub-AC 4: StageDone 수식 렌더링 연결 검증
 *
 * - StageDone 이 step.title/step.desc 를 MathText 로 렌더한다.
 * - 수식 포함 요약에서 parseSegments 가 inlineMath/blockMath 세그먼트를 반환한다
 *   (MathSegments 모듈로 분기됨).
 * - 수식 외 텍스트는 마크다운으로 해석되지 않는다 (외관 회귀 없음).
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { parseSegments } from "../lib/mathSegments";
import { StageDone } from "../stages/Done";
import { LearnContentProvider } from "../state/LearnContent";
import { type Step } from "../stages/data";

// ─── 수식 포함 step 픽스처 ────────────────────────────────────────────────────
const MATH_STEPS: Step[] = [
  {
    id: 1,
    title: "에너지 $E=mc^2$ 공식",
    desc: "질량과 에너지의 관계 $\\Delta E = \\Delta m \\cdot c^2$",
    body: "본문1",
    questions: [{ id: "1-1", q: "Q" }],
  },
  {
    id: 2,
    title: "블록 수식 $$F = ma$$",
    desc: "뉴턴 제2법칙: 힘은 질량 곱하기 가속도",
    body: "본문2",
    questions: [{ id: "2-1", q: "Q" }],
  },
  {
    id: 3,
    title: "수식 없는 제목",
    desc: "수식 없는 설명 - **굵게** *기울임* 미해석",
    body: "본문3",
    questions: [{ id: "3-1", q: "Q" }],
  },
];

function renderDone(steps: Step[] = MATH_STEPS) {
  return render(
    <LearnContentProvider initial={{ steps }}>
      <StageDone level={2} onPrev={() => {}} onRestart={() => {}} />
    </LearnContentProvider>,
  );
}

// ─── 1. parseSegments 분기 검증 (MathSegments 모듈 재사용 확인) ───────────────
describe("parseSegments - Done 요약 텍스트의 MathSegments 분기", () => {
  it("title '에너지 $E=mc^2$ 공식' → inlineMath 세그먼트로 분기", () => {
    const segs = parseSegments("에너지 $E=mc^2$ 공식");
    const mathSegs = segs.filter((s) => s.type === "inlineMath");
    expect(mathSegs.length).toBeGreaterThan(0);
    expect(mathSegs[0]).toMatchObject({ type: "inlineMath", latex: "E=mc^2" });
  });

  it("desc '$\\\\Delta E = ...$' → inlineMath 세그먼트로 분기", () => {
    const segs = parseSegments("$\\Delta E = \\Delta m \\cdot c^2$");
    const mathSegs = segs.filter((s) => s.type === "inlineMath");
    expect(mathSegs.length).toBeGreaterThan(0);
  });

  it("블록 수식 '$$F = ma$$' → blockMath 세그먼트로 분기", () => {
    const segs = parseSegments("블록 수식 $$F = ma$$");
    const mathSegs = segs.filter((s) => s.type === "blockMath");
    expect(mathSegs.length).toBeGreaterThan(0);
    expect(mathSegs[0]).toMatchObject({ type: "blockMath", latex: "F = ma" });
  });

  it("수식 없는 텍스트 → plain 세그먼트만 (마크다운 포함)", () => {
    const segs = parseSegments("수식 없는 설명 - **굵게** *기울임* 미해석");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  it("수식과 plain 혼합 → plain + inlineMath 혼합 배열", () => {
    const segs = parseSegments("에너지 $E=mc^2$ 공식");
    const types = segs.map((s) => s.type);
    expect(types).toContain("plain");
    expect(types).toContain("inlineMath");
  });
});

// ─── 2. StageDone 렌더 연결 검증 ─────────────────────────────────────────────
describe("StageDone - 요약 텍스트 수식 렌더링", () => {
  it("step.title 의 인라인 수식 '$E=mc^2$' → .katex 요소가 DOM에 존재", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    const firstTitle = rows[0].querySelector(".done2-rc-title");
    expect(firstTitle!.querySelector(".katex")).not.toBeNull();
  });

  it("step.desc 의 인라인 수식 → .katex 요소가 DOM에 존재", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    const firstDesc = rows[0].querySelector(".done2-rc-take");
    expect(firstDesc!.querySelector(".katex")).not.toBeNull();
  });

  it("step.title 의 블록 수식 '$$F = ma$$' → .katex-display 요소가 DOM에 존재", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    const secondTitle = rows[1].querySelector(".done2-rc-title");
    expect(secondTitle!.querySelector(".katex-display")).not.toBeNull();
  });

  it("수식 주변 plain 텍스트 보존 ('에너지', '공식' 은 텍스트로 남음)", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    const firstTitle = rows[0].querySelector(".done2-rc-title");
    expect(firstTitle!.textContent).toContain("에너지");
    expect(firstTitle!.textContent).toContain("공식");
  });

  it("수식 없는 step.desc 에 마크다운 해석 없음 - <strong>/<em>/<code> 태그 없음", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    // MATH_STEPS[2].desc = "수식 없는 설명 - **굵게** *기울임* 미해석"
    const thirdDesc = rows[2].querySelector(".done2-rc-take");
    expect(thirdDesc!.querySelector("strong")).toBeNull();
    expect(thirdDesc!.querySelector("em")).toBeNull();
    expect(thirdDesc!.querySelector("code")).toBeNull();
    // 원문 asterisk 가 텍스트로 남아있어야 함
    expect(thirdDesc!.textContent).toContain("**굵게**");
    expect(thirdDesc!.textContent).toContain("*기울임*");
  });

  it("수식 없는 step.title 은 .katex 없이 텍스트만 렌더됨", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    // MATH_STEPS[2].title = "수식 없는 제목"
    const thirdTitle = rows[2].querySelector(".done2-rc-title");
    expect(thirdTitle!.querySelector(".katex")).toBeNull();
    expect(thirdTitle!.textContent).toBe("수식 없는 제목");
  });

  it("모든 step 이 렌더되고 수식 포함 row 에서 KaTeX 존재", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    expect(rows).toHaveLength(MATH_STEPS.length);
    // 첫 두 row 에는 수식이 있으므로 .katex 가 있어야 함
    expect(rows[0].querySelector(".katex")).not.toBeNull();
    expect(rows[1].querySelector(".katex")).not.toBeNull();
    // 세 번째 row 에는 수식이 없으므로 .katex 없음
    expect(rows[2].querySelector(".katex")).toBeNull();
  });
});
