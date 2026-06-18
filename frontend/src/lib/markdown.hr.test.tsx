import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Markdown } from "./markdown";

// 마크다운 수평선(`---`/`***`/`___`)이 <hr> 로 렌더링되는지 검증.

describe("Markdown - 수평선(hr) 렌더링", () => {
  it("'---' 단독 줄 → <hr.md-hr> 렌더, 본문에 '---' 텍스트 안 남음", () => {
    const { container } = render(<Markdown text={"위 문단\n\n---\n\n아래 문단"} />);
    expect(container.querySelector("hr.md-hr")).not.toBeNull();
    expect(container.textContent).not.toContain("---");
    // 양쪽 문단은 정상 렌더
    expect(container.textContent).toContain("위 문단");
    expect(container.textContent).toContain("아래 문단");
  });

  it("'***', '___', '- - -' 변형도 hr 로 인식", () => {
    for (const rule of ["***", "___", "- - -"]) {
      const { container } = render(<Markdown text={`a\n\n${rule}\n\nb`} />);
      expect(container.querySelector("hr.md-hr")).not.toBeNull();
    }
  });

  it("표 구분선(`|---|`)이나 일반 텍스트는 hr 로 오인식하지 않음", () => {
    const { container } = render(<Markdown text={"보통 문장 - 하이픈 포함"} />);
    expect(container.querySelector("hr")).toBeNull();
  });
});
