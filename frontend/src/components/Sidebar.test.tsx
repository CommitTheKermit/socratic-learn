import { afterEach, describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import type { SessionMeta } from "../state/sessionIndex";
import { STAGE_LABELS } from "../stages/data";

const noop = () => {};

const sessions: SessionMeta[] = [
  { sessionId: "s1", createdAt: 2, conceptSummary: "코루틴이 왜 필요한지", stage: "learn" },
  { sessionId: "s2", createdAt: 1, conceptSummary: "제네릭 분산", stage: "done" },
];

function renderSidebar(props: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  return render(
    <Sidebar
      stage="input"
      concept=""
      onNewSession={noop}
      onToggleCollapse={noop}
      sessions={sessions}
      activeSessionId="s1"
      onSelectSession={noop}
      onDeleteSession={noop}
      {...props}
    />,
  );
}

describe("Sidebar 학습 히스토리 목록", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("sessions.map 으로 각 행에 conceptSummary 와 stage 라벨을 렌더링한다", () => {
    renderSidebar();
    expect(screen.getByText("코루틴이 왜 필요한지")).toBeInTheDocument();
    expect(screen.getByText("제네릭 분산")).toBeInTheDocument();
    expect(screen.getByText(STAGE_LABELS.learn)).toBeInTheDocument();
    expect(screen.getByText(STAGE_LABELS.done)).toBeInTheDocument();
  });

  test("activeSessionId 와 일치하는 행이 is-active 로 시각 구분된다", () => {
    const { container } = renderSidebar({ activeSessionId: "s1" });
    const active = container.querySelectorAll(".sb-history-item.is-active");
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain("코루틴이 왜 필요한지");
  });

  test("행 클릭 시 onSelectSession 이 해당 id 로 호출된다", () => {
    const onSelectSession = vi.fn();
    renderSidebar({ onSelectSession });
    fireEvent.click(screen.getByText("제네릭 분산"));
    expect(onSelectSession).toHaveBeenCalledWith("s2");
  });

  test("휴지통 버튼 클릭 시 window.confirm 통과하면 onDeleteSession 호출", () => {
    const onDeleteSession = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = renderSidebar({ onDeleteSession });
    const firstRow = container.querySelector(".sb-history-item")!;
    fireEvent.click(within(firstRow as HTMLElement).getByLabelText("세션 삭제"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onDeleteSession).toHaveBeenCalledWith("s1");
  });

  test("window.confirm 이 취소되면 onDeleteSession 을 호출하지 않는다", () => {
    const onDeleteSession = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container } = renderSidebar({ onDeleteSession });
    const firstRow = container.querySelector(".sb-history-item")!;
    fireEvent.click(within(firstRow as HTMLElement).getByLabelText("세션 삭제"));
    expect(onDeleteSession).not.toHaveBeenCalled();
  });

  test("sessions 빈 배열이면 빈 상태 문구를 보여준다", () => {
    renderSidebar({ sessions: [] });
    expect(screen.getByText("히스토리가 없습니다")).toBeInTheDocument();
  });
});
