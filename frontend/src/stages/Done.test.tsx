import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StageDone } from "./Done";
import { LearnContentProvider } from "../state/LearnContent";
import { type Step } from "./data";

const STEPS: Step[] = [
  { id: 1, title: "동시성과 병렬성", desc: "헷갈리기 쉬운 두 단어부터", body: "본문1", questions: [{ id: "1-1", q: "Q" }] },
  { id: 2, title: "스레드의 비용", desc: "왜 더 가벼운 단위가 필요할까", body: "본문2", questions: [{ id: "2-1", q: "Q" }] },
  { id: 3, title: "일시중단 함수", desc: "코루틴의 핵심 도구 - suspend", body: "본문3", questions: [{ id: "3-1", q: "Q" }] },
];

function renderDone(
  steps: Step[] = STEPS,
  handlers: { onPrev?: () => void; onRestart?: () => void } = {},
) {
  return render(
    <LearnContentProvider initial={{ steps }}>
      <StageDone
        onPrev={handlers.onPrev ?? (() => {})}
        onRestart={handlers.onRestart ?? (() => {})}
      />
    </LearnContentProvider>,
  );
}

describe("StageDone - 학습 완료 요약", () => {
  it("제목 '나이스 잡!'을 렌더하고 eyebrow '완료'/기존 sub는 없다", () => {
    const { container } = renderDone();
    expect(screen.getByRole("heading", { name: "나이스 잡!" })).toBeTruthy();
    expect(container.querySelector(".stage-eyebrow")).toBeNull();
    expect(container.querySelector(".stage-sub")).toBeNull();
    expect(screen.queryByText("완료")).toBeNull();
  });

  it("완료만으로 실력 상승을 주장하지 않고 학습 개념을 보여준다", () => {
    const { container } = renderDone();
    expect(container.querySelector(".done2-lvstrip")).toBeNull();
    expect(screen.getByText("이번 학습의 개념")).toBeTruthy();
    expect(screen.queryByText("오늘 익힌 것")).toBeNull();
    expect(screen.getByRole("button", { name: "메인으로 →" })).toBeTruthy();
  });

  it("steps 각각에 대해 체크 아이콘 + step.title + step.desc(=take)가 렌더된다", () => {
    const { container } = renderDone();
    const rows = container.querySelectorAll(".done2-rc-row");
    expect(rows).toHaveLength(STEPS.length);
    STEPS.forEach((s, i) => {
      const row = rows[i];
      expect(row.querySelector(".done2-rc-check svg")).not.toBeNull();
      expect(row.querySelector(".done2-rc-title")!.textContent).toBe(s.title);
      expect(row.querySelector(".done2-rc-take")!.textContent).toBe(s.desc);
    });
  });

  it("구 메타데이터 .done-card 행이 DOM에 없다", () => {
    const { container } = renderDone();
    expect(container.querySelector(".done-card")).toBeNull();
    expect(container.querySelector(".done-row")).toBeNull();
    expect(screen.queryByText("시작 수준")).toBeNull();
    expect(screen.queryByText(/모르겠어요/)).toBeNull();
    expect(screen.queryByText(/로컬 전용/)).toBeNull();
  });

  it("오른쪽 '메인으로 →'은 onRestart, 왼쪽 ghost '← 마지막 답변 다시 보기'는 onPrev를 호출한다", () => {
    const onPrev = vi.fn();
    const onRestart = vi.fn();
    renderDone(STEPS, { onPrev, onRestart });
    fireEvent.click(screen.getByRole("button", { name: "메인으로 →" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "← 마지막 답변 다시 보기" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });
});
