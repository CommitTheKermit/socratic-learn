import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BranchDialog } from "./BranchDialog";
import type { BranchOption } from "../../api/contract";

const options: BranchOption[] = [
  {
    label: "다음 로드맵 - 일시중단 함수",
    type: "roadmap_next",
    isRecommended: true,
    stageContent: { id: 3, title: "일시중단 함수", desc: "suspend", body: "", questions: [] },
  },
  {
    label: "스레드 비용 보강",
    type: "additional",
    isRecommended: false,
    stageContent: { id: 98, title: "스레드 비용", desc: "재정리", body: "", questions: [] },
  },
  {
    label: "여기서 학습을 마치기",
    type: "exit",
    isRecommended: false,
    stageContent: null,
  },
];

describe("BranchDialog - choose mode", () => {
  test("open=false 면 아무것도 렌더되지 않는다", () => {
    const { container } = render(
      <BranchDialog
        open={false}
        evaluationText="평가 텍스트"
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    expect(container.querySelector(".bd-frame")).toBeNull();
  });

  test("evaluationText 가 다이얼로그에 표시된다", () => {
    render(
      <BranchDialog
        open={true}
        evaluationText="부분적으로 정답"
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText("부분적으로 정답")).toBeInTheDocument();
  });

  test("isRecommended=true 인 옵션에 추천 배지가 표시된다", () => {
    render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    const badges = screen.getAllByText("추천");
    expect(badges.length).toBe(1);
  });

  test("옵션 클릭 시 onChoose 가 해당 옵션을 인자로 호출된다", () => {
    const onChoose = vi.fn();
    render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={onChoose}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByText("스레드 비용 보강"));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose.mock.calls[0][0]).toEqual(options[1]);
  });

  test("backdrop 또는 닫기 버튼 클릭 시 onClose 가 호출된다", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={onClose}
      />
    );
    fireEvent.click(container.querySelector(".bd-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText("닫기"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("exit 타입 옵션은 is-exit 클래스로 약하게 표시된다", () => {
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    const exitCard = container.querySelector(".bd-card.is-exit");
    expect(exitCard).not.toBeNull();
    expect(exitCard?.textContent).toContain("여기서 학습을 마치기");
  });
});

describe("BranchDialog - error mode (다이얼로그 안에서 표현)", () => {
  test("error prop 이 있으면 ChooseMode 대신 ErrorMode 가 같은 dialog shell 안에 렌더된다", () => {
    const onRetry = vi.fn();
    const onExit = vi.fn();
    render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
        error={{
          message: "응답을 분기로 해석하지 못했습니다",
          retryCount: 2,
          technicalDetail: "ParseError: missing branchOptions",
          onRetry,
          onExit,
        }}
      />
    );
    // 같은 dialog frame 안
    expect(document.querySelector(".bd-frame")).not.toBeNull();
    expect(document.querySelector(".bd-err-card")).not.toBeNull();
    expect(screen.getByText("응답을 분기로 해석하지 못했습니다")).toBeInTheDocument();
    expect(screen.getByText("재시도 2회")).toBeInTheDocument();
    // 분기 옵션 카드는 렌더되지 않음
    expect(document.querySelector(".bd-card")).toBeNull();
  });

  test("재시도 버튼 클릭 시 onRetry 가 호출된다", () => {
    const onRetry = vi.fn();
    render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
        error={{ message: "x", retryCount: 0, onRetry, onExit: () => {} }}
      />
    );
    fireEvent.click(screen.getByText(/다시 시도/));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("학습 종료 버튼 클릭 시 onExit 가 호출된다", () => {
    const onExit = vi.fn();
    render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
        error={{ message: "x", retryCount: 0, onRetry: () => {}, onExit }}
      />
    );
    fireEvent.click(screen.getByText("학습 종료"));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
