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

// ─── Sub-AC 2: 수식 포함 선택지 - MathSegments 분기 확인 ─────────────────────
describe("BranchDialog - 수식 포함 선택지 MathSegments 렌더링", () => {
  const mathOptions: BranchOption[] = [
    {
      label: "에너지 $E=mc^2$ 개념",
      type: "ai_recommended",
      isRecommended: true,
      stageContent: { id: 50, title: "에너지", desc: "공식 이해", body: "", questions: [] },
    },
    {
      label: "**bold** 없이 $x^2$ 만 수식",
      type: "additional",
      isRecommended: false,
      stageContent: { id: 51, title: "제곱", desc: "설명", body: "", questions: [] },
    },
  ];

  test("수식 포함 label 이 KaTeX 로 렌더된다 (MathSegments 경유)", () => {
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={mathOptions}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    // .bd-label 안에 KaTeX 마크업이 존재 = parseSegments 로 분기됐음을 의미
    const labels = container.querySelectorAll(".bd-label");
    const mathLabel = Array.from(labels).find(el =>
      el.querySelector(".katex") !== null
    );
    expect(mathLabel).not.toBeUndefined();
  });

  test("label 의 수식이 KaTeX 인라인으로 치환되고 주변 텍스트는 보존된다", () => {
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={[mathOptions[0]]}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container.textContent).toContain("에너지");
    expect(container.textContent).toContain("개념");
  });

  test("label 의 **bold** 는 마크다운으로 해석되지 않고 문자 그대로 표시된다", () => {
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={[mathOptions[1]]}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    // MathSegments 파싱: $x^2$ 만 KaTeX 처리됨
    expect(container.querySelector(".katex")).not.toBeNull();
    // **bold** 는 <strong> 으로 변환되지 않음 (마크다운 미해석)
    expect(container.querySelector("strong")).toBeNull();
    // 원문 asterisk 유지
    expect(container.textContent).toContain("**bold**");
  });

  test("수식 없는 label 은 KaTeX 없이 원문 그대로 표시된다", () => {
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={options}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    const plainLabel = Array.from(container.querySelectorAll(".bd-label"))
      .find(el => el.textContent?.includes("스레드 비용 보강"));
    expect(plainLabel).not.toBeUndefined();
    // 수식 없으므로 해당 label 안에 katex 없음
    expect(plainLabel?.querySelector(".katex")).toBeNull();
  });

  test("블록 수식 '$$E=mc^2$$' 포함 label 도 KaTeX display 로 렌더된다", () => {
    const blockMathOption: BranchOption[] = [
      {
        label: "$$E=mc^2$$",
        type: "additional",
        isRecommended: false,
        stageContent: { id: 52, title: "블록", desc: "수식", body: "", questions: [] },
      },
    ];
    const { container } = render(
      <BranchDialog
        open={true}
        evaluationText=""
        options={blockMathOption}
        onChoose={() => {}}
        onClose={() => {}}
      />
    );
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });
});
