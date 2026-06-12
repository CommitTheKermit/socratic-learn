/**
 * Sub-AC 5: 학생 입력 에코 수식 렌더링 연결 검증
 *
 * - 평가 완료(locked) 상태에서 .qa-answer--echo div 가 MathText 렌더러로 표시된다.
 * - 에코 텍스트 내 수식($...$, $$...$$)이 parseSegments -> KaTeX 로 정확히 치환된다.
 * - 수식 외 텍스트(**bold**, *italic* 등)는 마크다운으로 해석되지 않는다.
 * - parseSegments(mathSegments 모듈)가 에코 텍스트를 올바르게 분기한다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { sessionKey } from "../state/sessionPersist";
import { parseSegments } from "../lib/mathSegments";
import App from "../App";

// ─── 네트워크 stub ──────────────────────────────────────────────────────────
vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  generateProbeQuestions: vi.fn(async () => []),
  generateRoadmapOutline: vi.fn(async () => [
    { title: "단계 1", desc: "설명 1" },
  ]),
  generateStepDetail: vi.fn(async () => ({ body: "본문", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({
    evaluations: [{ id: "q1", grade: "correct", feedback: "좋아요" }],
  })),
}));

vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────
function renderApp(entries: string[]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <App />
    </MemoryRouter>,
  );
}

/**
 * 평가 완료 상태(locked)의 learn 세션을 localStorage 에 시드한다.
 * stepEvaluations 가 있으면 isEvaluated=true 가 되어 QaAnswer 가 에코 div 로 전환된다.
 */
function seedLockedEchoSession(sessionId: string, answer: string) {
  localStorage.setItem(
    sessionKey(sessionId),
    JSON.stringify({
      sessionId,
      createdAt: 1000,
      conceptSummary: "물리학",
      stage: "learn",
      mode: "socratic",
      concept: "물리학",
      materials: "",
      probes: {},
      estimatedLevel: 2,
      stepIdx: 0,
      answers: { q1: answer },
      skips: {},
      steps: [
        {
          id: 1,
          title: "단계 1",
          desc: "설명 1",
          body: "본문 1",
          questions: [{ id: "q1", q: "속도 공식을 설명하세요." }],
        },
      ],
      stepEvaluations: {
        0: { evaluations: [{ id: "q1", grade: "correct", feedback: "좋아요" }] },
      },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ─── 1. parseSegments 분기 검증 (에코 텍스트 시나리오) ──────────────────────
describe("parseSegments - 에코 텍스트 MathSegments 분기", () => {
  test("수식 포함 에코 텍스트 '속도 $v=d/t$' → inlineMath 세그먼트로 분기", () => {
    const segs = parseSegments("속도 $v=d/t$ 단위는 m/s");
    const mathSegs = segs.filter((s) => s.type === "inlineMath");
    expect(mathSegs.length).toBeGreaterThan(0);
    expect(mathSegs[0]).toMatchObject({ type: "inlineMath", latex: "v=d/t" });
  });

  test("수식 외 **bold** 에코 → plain 세그먼트만 반환 (마크다운 미해석)", () => {
    const segs = parseSegments("**bold** 텍스트 답변");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  test("블록 수식 '$$E=mc^2$$' 포함 에코 → blockMath 세그먼트로 분기", () => {
    const segs = parseSegments("공식: $$E=mc^2$$");
    const mathSegs = segs.filter((s) => s.type === "blockMath");
    expect(mathSegs.length).toBeGreaterThan(0);
    expect(mathSegs[0]).toMatchObject({ type: "blockMath", latex: "E=mc^2" });
  });

  test("가격 표기 '$10 지불' → 수식으로 해석하지 않음 (plain)", () => {
    const segs = parseSegments("$10 지불했다");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  test("닫히지 않은 '$x^2+' → plain 유지 (에코 폴백)", () => {
    const segs = parseSegments("$x^2+");
    expect(segs.every((s) => s.type === "plain")).toBe(true);
  });

  test("수식+plain 혼합 에코 → 타입 배열에 plain + inlineMath 포함", () => {
    const segs = parseSegments("속도 $v=d/t$ 단위");
    const types = segs.map((s) => s.type);
    expect(types).toContain("plain");
    expect(types).toContain("inlineMath");
  });
});

// ─── 2. 에코 표면 렌더 연결 검증 (MathText 경유 확인) ──────────────────────
describe("AnswerEcho - 학생 입력 에코 수식 KaTeX 렌더링", () => {
  test("평가 완료 후 .qa-answer--echo div 가 존재하고 textarea.qa-answer 는 없다", async () => {
    const sessionId = "echo-exists";
    seedLockedEchoSession(sessionId, "일반 답변");

    renderApp([`/s/${sessionId}/learn/0`]);

    const echoEl = await screen.findByText("일반 답변");
    expect(echoEl.closest(".qa-answer--echo")).not.toBeNull();
    expect(document.querySelector("textarea.qa-answer")).toBeNull();
  });

  test("에코 텍스트 '$v=d/t$' 수식이 .katex 요소로 렌더된다 (MathText 경유)", async () => {
    const sessionId = "echo-math-inline";
    seedLockedEchoSession(sessionId, "속도 $v=d/t$ 단위는 m/s");

    const { container } = renderApp([`/s/${sessionId}/learn/0`]);

    // 에코 div 가 렌더될 때까지 대기
    await waitFor(() => expect(container.querySelector(".qa-answer--echo")).not.toBeNull());
    const echoDiv = container.querySelector(".qa-answer--echo");
    expect(echoDiv).not.toBeNull();
    // MathText 렌더러 경유: .katex 존재
    expect(echoDiv!.querySelector(".katex")).not.toBeNull();
  });

  test("에코 텍스트의 수식 주변 plain 텍스트 보존 ('속도', '단위는 m/s' 유지)", async () => {
    const sessionId = "echo-plain-preserved";
    seedLockedEchoSession(sessionId, "속도 $v=d/t$ 단위는 m/s");

    const { container } = renderApp([`/s/${sessionId}/learn/0`]);

    await waitFor(() => expect(container.querySelector(".qa-answer--echo")).not.toBeNull());
    const echoDiv = container.querySelector(".qa-answer--echo");
    expect(echoDiv!.textContent).toContain("속도");
    expect(echoDiv!.textContent).toContain("단위는 m/s");
  });

  test("에코 텍스트 '**bold** 답변' → <strong> 없이 원문 보존 (마크다운 미해석)", async () => {
    const sessionId = "echo-no-md";
    seedLockedEchoSession(sessionId, "**bold** 텍스트 답변입니다");

    const { container } = renderApp([`/s/${sessionId}/learn/0`]);

    await screen.findByText(/텍스트 답변입니다/);
    const echoDiv = container.querySelector(".qa-answer--echo");
    // MathText: 마크다운 미해석 - <strong> 없음
    expect(echoDiv!.querySelector("strong")).toBeNull();
    // 원문 asterisk 보존
    expect(echoDiv!.textContent).toContain("**bold**");
  });

  test("에코 텍스트에 수식 없으면 .katex 없이 원문만 표시된다", async () => {
    const sessionId = "echo-no-math";
    seedLockedEchoSession(sessionId, "수식 없는 일반 답변입니다");

    const { container } = renderApp([`/s/${sessionId}/learn/0`]);

    await screen.findByText("수식 없는 일반 답변입니다");
    const echoDiv = container.querySelector(".qa-answer--echo");
    expect(echoDiv!.querySelector(".katex")).toBeNull();
    expect(echoDiv!.textContent).toBe("수식 없는 일반 답변입니다");
  });

  test("블록 수식 '$$E=mc^2$$' 포함 에코 → .katex-display 렌더됨", async () => {
    const sessionId = "echo-math-block";
    seedLockedEchoSession(sessionId, "공식: $$E=mc^2$$");

    const { container } = renderApp([`/s/${sessionId}/learn/0`]);

    await screen.findByText(/공식:/);
    const echoDiv = container.querySelector(".qa-answer--echo");
    expect(echoDiv!.querySelector(".katex-display")).not.toBeNull();
  });
});
