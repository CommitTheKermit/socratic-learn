import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StageDone } from "./Done";
import { LearnContentProvider } from "../state/LearnContent";
import { LEVEL_LABELS, type Step } from "./data";

const STEPS: Step[] = [
  { id: 1, title: "동시성과 병렬성", desc: "헷갈리기 쉬운 두 단어부터", body: "본문1", questions: [{ id: "1-1", q: "Q" }] },
  { id: 2, title: "스레드의 비용", desc: "왜 더 가벼운 단위가 필요할까", body: "본문2", questions: [{ id: "2-1", q: "Q" }] },
  { id: 3, title: "일시중단 함수", desc: "코루틴의 핵심 도구 - suspend", body: "본문3", questions: [{ id: "3-1", q: "Q" }] },
];

function renderDone(
  level: number | null,
  steps: Step[] = STEPS,
  handlers: { onPrev?: () => void; onRestart?: () => void } = {},
) {
  return render(
    <LearnContentProvider initial={{ steps }}>
      <StageDone
        level={level}
        onPrev={handlers.onPrev ?? (() => {})}
        onRestart={handlers.onRestart ?? (() => {})}
      />
    </LearnContentProvider>,
  );
}

describe("StageDone — 통합안 E", () => {
  it("제목 '나이스 잡!'을 렌더하고 eyebrow '완료'/기존 sub는 없다", () => {
    const { container } = renderDone(2);
    expect(screen.getByRole("heading", { name: "나이스 잡!" })).toBeTruthy();
    expect(container.querySelector(".stage-eyebrow")).toBeNull();
    expect(container.querySelector(".stage-sub")).toBeNull();
    expect(screen.queryByText("완료")).toBeNull();
  });

  it("level이 number이면 수준 변화 카드가 LEVEL_LABELS[level] -> LEVEL_LABELS[min(level+1,4)]로 렌더된다", () => {
    const { container } = renderDone(2);
    const strip = container.querySelector(".done2-lvstrip");
    expect(strip).not.toBeNull();
    expect(strip!.querySelector(".from")!.textContent).toBe("L2");
    expect(strip!.querySelector(".to")!.textContent).toBe("L3");
    // 부제는 시작 라벨 -> 도착 라벨로 동적 생성
    expect(strip!.querySelector(".done2-lvstrip-sub")!.textContent).toBe(
      `${LEVEL_LABELS[2]} → ${LEVEL_LABELS[3]}`,
    );
  });

  it("level이 null이면 수준 변화 카드 요소가 DOM에 없다", () => {
    const { container } = renderDone(null);
    expect(container.querySelector(".done2-lvstrip")).toBeNull();
    // 회고 카드와 버튼은 여전히 존재
    expect(container.querySelector(".done2-recap")).not.toBeNull();
    expect(screen.getByRole("button", { name: "메인으로 →" })).toBeTruthy();
  });

  it("최고 단계(level=4)에서 도착 수준이 +1 되지 않고 클램프된다", () => {
    const { container } = renderDone(4);
    const strip = container.querySelector(".done2-lvstrip")!;
    expect(strip.querySelector(".from")!.textContent).toBe("L4");
    // index 5(LEVEL_LABELS 범위 밖)로 넘어가지 않음 -> 도착도 L4
    expect(strip.querySelector(".to")!.textContent).toBe("L4");
    const last = LEVEL_LABELS[LEVEL_LABELS.length - 1];
    expect(strip.querySelector(".done2-lvstrip-sub")!.textContent).toBe(`${last} → ${last}`);
    // undefined 라벨이 새지 않는다
    expect(strip.textContent).not.toContain("undefined");
  });

  it("steps 각각에 대해 체크 아이콘 + step.title + step.desc(=take)가 렌더된다", () => {
    const { container } = renderDone(1);
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
    const { container } = renderDone(2);
    expect(container.querySelector(".done-card")).toBeNull();
    expect(container.querySelector(".done-row")).toBeNull();
    expect(screen.queryByText("시작 수준")).toBeNull();
    expect(screen.queryByText(/모르겠어요/)).toBeNull();
    expect(screen.queryByText(/로컬 전용/)).toBeNull();
  });

  it("오른쪽 '메인으로 →'은 onRestart, 왼쪽 ghost '← 마지막 답변 다시 보기'는 onPrev를 호출한다", () => {
    const onPrev = vi.fn();
    const onRestart = vi.fn();
    renderDone(2, STEPS, { onPrev, onRestart });
    fireEvent.click(screen.getByRole("button", { name: "메인으로 →" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "← 마지막 답변 다시 보기" }));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });
});
