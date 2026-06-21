/**
 * Sub-AC 1: Probe.tsx 수식 렌더링 연결 검증
 *
 * - StageProbe 가 probe 질문 텍스트를 MathText 로 렌더한다.
 * - 수식 포함 문자열에서 parseSegments 가 inlineMath/blockMath 세그먼트를 반환한다
 *   (MathSegments 모듈로 분기됨).
 * - 수식 외 텍스트는 마크다운으로 해석되지 않는다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { parseSegments } from "../lib/mathSegments";

// ─── useLearnContent mock ────────────────────────────────────────────────────
// StageProbe 는 useLearnContent().probeQuestions 로 문항을 가져온다.
// 수식이 포함된 문항을 주입해 렌더 결과를 검증한다.

const mathChoiceQ = {
  id: "p1" as const,
  kind: "choice" as const,
  q: "에너지 $E=mc^2$ 를 아시나요?",
  sub: "힌트: $a^2 + b^2 = c^2$ 를 떠올려 보세요",
  options: [
    { value: 0, label: "속도 $v$ 만 압니다" },
    { value: 1, label: "가속도 $a = dv/dt$ 도 압니다" },
  ],
};

const mathMultiQ = {
  id: "p2" as const,
  kind: "multi" as const,
  q: "함수 $f(x)=x^2$ 와 연관된 것은?",
  sub: "예: $\\int_0^1 x\\,dx$",
  options: [
    { value: "a", label: "미분 $f'(x)$", correct: true },
    { value: "b", label: "적분 $\\int f\\,dx$", correct: false },
  ],
};

const mathTextQ = {
  id: "p3" as const,
  kind: "text" as const,
  q: "미분 $\\frac{dy}{dx}$ 를 한 줄로 설명해 보세요",
  placeholder: "설명...",
};

vi.mock("../state/LearnContent", () => ({
  useLearnContent: () => ({
    probeQuestions: [mathChoiceQ, mathMultiQ, mathTextQ],
    probeStatus: "ready",
    probeError: null,
    probeFromFallback: false,
    loadProbe: vi.fn(),
  }),
}));

vi.mock("../api/claudeContent", () => ({
  detectOverwhelm: vi.fn(),
  generateProbeQuestions: vi.fn(),
  ClaudeContentError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { StageProbe } from "../stages/Probe";

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────
function renderProbe() {
  return render(
    <StageProbe
      concept="물리학"
      materials=""
      probes={{}}
      setProbes={vi.fn()}
      setEstimatedLevel={vi.fn()}
      onPrev={vi.fn()}
      onNext={vi.fn()}
      prereq={{ depth: 0, onOpen: vi.fn(), onReturnToParent: vi.fn(), onNewIndependent: vi.fn() }}
      onRetry={vi.fn()}
    />,
  );
}

// ─── 1. parseSegments 분기 검증 ───────────────────────────────────────────────
describe("parseSegments - MathSegments 모듈 분기", () => {
  it("수식 포함 문자열 → inlineMath 세그먼트로 분기", () => {
    const segs = parseSegments("에너지 $E=mc^2$ 를 아시나요?");
    const mathSegs = segs.filter((s) => s.type === "inlineMath");
    expect(mathSegs.length).toBeGreaterThan(0);
    expect(mathSegs[0]).toMatchObject({ type: "inlineMath", latex: "E=mc^2" });
  });

  it("수식 없는 문자열 → plain 세그먼트만", () => {
    const segs = parseSegments("일반 텍스트 질문입니다");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  it("블록 수식 $$...$$ → blockMath 세그먼트로 분기", () => {
    const segs = parseSegments("공식 $$E=mc^2$$ 입니다");
    const mathSegs = segs.filter((s) => s.type === "blockMath");
    expect(mathSegs.length).toBeGreaterThan(0);
    expect(mathSegs[0]).toMatchObject({ type: "blockMath", latex: "E=mc^2" });
  });

  it("가격 표기 '$5 할인' → 수식으로 해석하지 않음 (plain)", () => {
    const segs = parseSegments("$5 할인");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  it("닫히지 않은 '$x^2+' → plain 유지", () => {
    const segs = parseSegments("$x^2+");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });
});

// ─── 2. StageProbe 렌더 연결 검증 ─────────────────────────────────────────────
describe("StageProbe - 질문 텍스트 수식 렌더링", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("choice 질문의 수식이 KaTeX 로 렌더된다", () => {
    const { container } = renderProbe();
    // 모든 .probe-q 영역을 순회해 katex 요소 확인
    const katexEls = container.querySelectorAll(".katex");
    expect(katexEls.length).toBeGreaterThan(0);
  });

  it("choice 질문 텍스트 '$E=mc^2$' → .katex 존재, <strong> 없음", () => {
    const { container } = renderProbe();
    // KaTeX 렌더됨
    expect(container.querySelector(".katex")).not.toBeNull();
    // 마크다운 미해석: bold 없음
    expect(container.querySelector("strong")).toBeNull();
  });

  it("multi 질문 수식 '$f(x)=x^2$' → .katex 존재", () => {
    const { container } = renderProbe();
    const probeRows = container.querySelectorAll(".probe-row");
    // 세 개 문항 모두 렌더됨
    expect(probeRows.length).toBe(3);
    // 전체에서 여러 개의 KaTeX 렌더 확인 (choice + multi + text 각 1개씩)
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(3);
  });

  it("text 질문 수식 '\\frac{dy}{dx}' → .katex 존재", () => {
    const { container } = renderProbe();
    // 세 번째 probe-q (text 질문)
    const probeQs = container.querySelectorAll(".probe-q");
    const lastQ = probeQs[probeQs.length - 1];
    expect(lastQ.querySelector(".katex")).not.toBeNull();
  });

  it("수식 주변 plain 텍스트 보존 ('에너지'와 '를 아시나요?' 는 텍스트로 남음)", () => {
    const { container } = renderProbe();
    // choice q 텍스트에 주변 한국어 텍스트가 남아있음
    const probeQs = container.querySelectorAll(".probe-q");
    expect(probeQs[0].textContent).toContain("에너지");
    expect(probeQs[0].textContent).toContain("를 아시나요?");
  });

  it("질문 텍스트에 마크다운 해석 없음 - em/code/strong 태그 없음", () => {
    const { container } = renderProbe();
    expect(container.querySelector("em")).toBeNull();
    expect(container.querySelector("code")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });
});

// ─── 3. 선택지 라벨·칩·서브텍스트 수식 렌더 검증 (회귀: $ 원문 노출 버그) ──────────
// 버그: 질문 본문(p.q)만 MathText 를 거치고 선택지 라벨(choice/multi)·probe-sub 는
// raw 로 렌더돼 "$v$" 같은 원문이 그대로 노출됐다. 라벨/칩/서브도 MathText 로 라우팅.
describe("StageProbe - 선택지 라벨·칩·서브 수식 렌더링", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("choice 선택지 라벨의 $...$ 가 KaTeX 로 렌더되고 원문 $ 가 남지 않는다", () => {
    const { container } = renderProbe();
    const labels = container.querySelectorAll(".probe-label");
    expect(labels.length).toBe(2);
    labels.forEach((el) => {
      expect(el.querySelector(".katex")).not.toBeNull();
      expect(el.textContent).not.toContain("$");
    });
  });

  it("multi 칩 라벨의 $...$ 가 KaTeX 로 렌더되고 원문 $ 가 남지 않는다", () => {
    const { container } = renderProbe();
    const chips = container.querySelectorAll(".probe-chip");
    expect(chips.length).toBe(2);
    chips.forEach((el) => {
      expect(el.querySelector(".katex")).not.toBeNull();
      expect(el.textContent).not.toContain("$");
    });
  });

  it("probe-sub 서브텍스트의 $...$ 가 KaTeX 로 렌더된다 (choice·multi 서브)", () => {
    const { container } = renderProbe();
    const mathSubs = Array.from(container.querySelectorAll(".probe-sub")).filter(
      (el) => el.querySelector(".katex"),
    );
    expect(mathSubs.length).toBeGreaterThanOrEqual(2);
    mathSubs.forEach((el) => expect(el.textContent).not.toContain("$"));
  });

  it("선택지 라벨·칩에 마크다운 해석 없음 (em/strong/code 태그 없음)", () => {
    const { container } = renderProbe();
    container.querySelectorAll(".probe-label, .probe-chip").forEach((el) => {
      expect(el.querySelector("em")).toBeNull();
      expect(el.querySelector("strong")).toBeNull();
      expect(el.querySelector("code")).toBeNull();
    });
  });
});
