/**
 * 업데이트 소식(What's New) 플라이아웃 UI 배선 통합 테스트
 *
 * 디자인 확정안(시안 D + 좌측 플라이아웃)의 동작을 jsdom 에서 검증한다:
 * - 사이드바 "업데이트" 클릭 → 플라이아웃(스크림 + 패널)이 렌더된다
 * - 스크림 / Esc / × 버튼으로 닫힌다
 * - 미확인 업데이트면 빨간 점이 보이고, 한 번 열면(= 본 것으로 기록) 사라진다
 * - 재마운트(새로고침 모사) 후에도 빨간 점 소멸 상태가 유지된다(localStorage 출처)
 * - 비모달이라 플라이아웃을 열고 닫아도 입력값(학습 상태)이 보존된다
 *
 * useAuth/AuthProvider/firebase/analytics 는 vitest.setup.ts 가 전역 mock 한다.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

// 학습 콘텐츠 로드(네트워크/Claude)를 stub 해 격리한다(input 단계에선 호출되지 않지만 안전망).
vi.mock("../api/claudeContent", () => ({
  ClaudeContentError: class ClaudeContentError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  generateProbeQuestions: vi.fn(async () => []),
  generateRoadmapOutline: vi.fn(async () => []),
  generateStepDetail: vi.fn(async () => ({ body: "", questions: [] })),
  generateAnswerEvaluation: vi.fn(async () => ({ evaluations: [] })),
}));

// 원격 세션 API stub
vi.mock("../api/sessionApi", () => ({
  deleteSessionRemote: vi.fn(async () => undefined),
  saveSessionRemote: vi.fn(async () => undefined),
  listSessionsRemote: vi.fn(async () => []),
  getSessionRemote: vi.fn(async () => null),
}));

beforeEach(() => {
  localStorage.clear();
});

function renderApp() {
  return render(
    <MemoryRouter initialEntries={["/s/wn-test"]}>
      <App />
    </MemoryRouter>,
  );
}

/** 사이드바 "업데이트" 트리거 버튼. */
function trigger(container: HTMLElement) {
  return container.querySelector(".sb-wn") as HTMLButtonElement;
}

const PLACEHOLDER = "배우고 싶은 개념을 입력해서 시작해보세요";

describe("업데이트 소식 플라이아웃 - UI 배선", () => {
  test("사이드바 '업데이트' 클릭 시 플라이아웃(스크림 + 패널)이 렌더된다", () => {
    const { container } = renderApp();
    expect(container.querySelector(".wn-flyout")).toBeNull();

    fireEvent.click(trigger(container));

    const flyout = container.querySelector(".wn-flyout") as HTMLElement;
    expect(flyout).not.toBeNull();
    expect(container.querySelector(".wn-flyout-scrim")).not.toBeNull();
    expect(within(flyout).getByText("업데이트 소식")).toBeTruthy();
  });

  test("스크림 클릭 시 플라이아웃이 닫힌다", () => {
    const { container } = renderApp();
    fireEvent.click(trigger(container));
    fireEvent.click(container.querySelector(".wn-flyout-scrim") as HTMLElement);
    expect(container.querySelector(".wn-flyout")).toBeNull();
  });

  test("Esc 키 입력 시 플라이아웃이 닫힌다", () => {
    const { container } = renderApp();
    fireEvent.click(trigger(container));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(container.querySelector(".wn-flyout")).toBeNull();
  });

  test("× 버튼 클릭 시 플라이아웃이 닫힌다", () => {
    const { container } = renderApp();
    fireEvent.click(trigger(container));
    const flyout = container.querySelector(".wn-flyout") as HTMLElement;
    fireEvent.click(within(flyout).getByLabelText("닫기"));
    expect(container.querySelector(".wn-flyout")).toBeNull();
  });

  test("미확인 업데이트면 빨간 점이 보이고, 한 번 열면 사라진다", () => {
    const { container } = renderApp();
    expect(container.querySelector(".sb-wn .wn-sb-dot")).not.toBeNull();

    fireEvent.click(trigger(container));
    fireEvent.keyDown(document.body, { key: "Escape" }); // 닫아도 본 것으로 기록됨

    expect(container.querySelector(".sb-wn .wn-sb-dot")).toBeNull();
  });

  test("재마운트(새로고침 모사) 후에도 빨간 점 소멸 상태가 유지된다", () => {
    const first = renderApp();
    fireEvent.click(trigger(first.container)); // 열면 markWhatsNewSeen 으로 localStorage 기록
    first.unmount();

    const second = renderApp(); // localStorage 가 출처라 본 상태로 시작
    expect(second.container.querySelector(".sb-wn .wn-sb-dot")).toBeNull();
  });

  test("플라이아웃을 열고 닫아도 입력값(학습 상태)이 보존된다", () => {
    renderApp();
    const ta = screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "재귀함수" } });

    fireEvent.click(document.querySelector(".sb-wn") as HTMLButtonElement);
    fireEvent.keyDown(document.body, { key: "Escape" });

    expect((screen.getByPlaceholderText(PLACEHOLDER) as HTMLTextAreaElement).value).toBe("재귀함수");
  });
});
