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
      drawerState="open"
      onNewSession={noop}
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

  test("휴지통 버튼 클릭 시 확인 팝업 없이 즉시 onDeleteSession 호출", () => {
    const onDeleteSession = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm");
    const { container } = renderSidebar({ onDeleteSession });
    const firstRow = container.querySelector(".sb-history-item")!;
    fireEvent.click(within(firstRow as HTMLElement).getByLabelText("세션 삭제"));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onDeleteSession).toHaveBeenCalledWith("s1");
  });

  test("sessions 빈 배열이면 빈 상태 문구를 보여준다", () => {
    renderSidebar({ sessions: [] });
    expect(screen.getByText("히스토리가 없습니다")).toBeInTheDocument();
  });
});

describe("Sidebar 로그인 상태 분기 (sb-foot)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("비로그인이면 로그인 유도 문구와 로그인 버튼을 보여주고, 클릭 시 onLogin 호출", () => {
    const onLogin = vi.fn();
    renderSidebar({ loggedIn: false, onLogin });
    expect(screen.getByText("로그인하면 학습 기록이 기기 간에 이어져요")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  test("로그인 상태면 userName 과 로그아웃 버튼을 보여주고, 클릭 시 onLogout 호출", () => {
    const onLogout = vi.fn();
    renderSidebar({ loggedIn: true, userName: "테스터", onLogout });
    expect(screen.getByText("테스터")).toBeInTheDocument();
    expect(screen.queryByText("로그인하면 학습 기록이 기기 간에 이어져요")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("로그아웃"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  test("photoURL 이 있으면 아바타 이미지를, 없으면 이름 이니셜을 렌더한다", () => {
    const { container, rerender } = renderSidebar({
      loggedIn: true,
      userName: "테스터",
      photoURL: "https://example.com/a.png",
    });
    const img = container.querySelector("img.sb-avatar-img");
    expect(img).toHaveAttribute("src", "https://example.com/a.png");

    rerender(
      <Sidebar
        stage="input"
        concept=""
        onNewSession={noop}
        sessions={sessions}
        activeSessionId="s1"
        onSelectSession={noop}
        onDeleteSession={noop}
        loggedIn
        userName="테스터"
      />,
    );
    expect(container.querySelector("img.sb-avatar-img")).not.toBeInTheDocument();
    expect(screen.getByText("테")).toBeInTheDocument();
  });
});

describe("Sidebar 히스토리 로딩 스켈레톤", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  test("sessions===undefined + 로그인 상태(로딩)면 스켈레톤을 5행 보여준다", () => {
    const { container } = renderSidebar({ sessions: undefined, loggedIn: true });
    expect(container.querySelector(".sb-hist-skel")).toBeInTheDocument();
    expect(container.querySelectorAll(".sb-hist-skel .shi")).toHaveLength(5);
    expect(screen.queryByText("히스토리가 없습니다")).not.toBeInTheDocument();
  });

  test("sessions===undefined + 인증 미확정(authPending)도 스켈레톤을 보여준다", () => {
    const { container } = renderSidebar({
      sessions: undefined,
      authPending: true,
      loggedIn: false,
    });
    expect(container.querySelector(".sb-hist-skel")).toBeInTheDocument();
  });

  test("sessions===undefined + 비로그인(fetch 없음)이면 스켈레톤 대신 빈 상태", () => {
    const { container } = renderSidebar({
      sessions: undefined,
      loggedIn: false,
      authPending: false,
    });
    expect(container.querySelector(".sb-hist-skel")).not.toBeInTheDocument();
    expect(screen.getByText("히스토리가 없습니다")).toBeInTheDocument();
  });

  test("sessions===undefined + 활성 세션(진행 중)이면 스켈레톤 대신 현재 세션을 보여준다", () => {
    const { container } = renderSidebar({
      sessions: undefined,
      loggedIn: true,
      stage: "learn",
      concept: "이벤트 루프",
    });
    expect(container.querySelector(".sb-hist-skel")).not.toBeInTheDocument();
    expect(screen.getByText("이벤트 루프")).toBeInTheDocument();
    expect(screen.getByText("진행 중")).toBeInTheDocument();
  });
});
