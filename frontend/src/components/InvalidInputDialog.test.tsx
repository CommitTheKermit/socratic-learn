/**
 * InvalidInputDialog 단위 테스트(AC: 차단 모달은 일반 메시지 + 단일 재입력 액션만, 사유/우회 미노출).
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InvalidInputDialog } from "./InvalidInputDialog";

describe("InvalidInputDialog", () => {
  test("일반 메시지를 보여주고 사유 카테고리 문구는 노출하지 않는다", () => {
    render(<InvalidInputDialog onClose={() => {}} />);
    expect(screen.getByText("학습에 사용할 수 있는 내용을 입력해 주세요.")).toBeTruthy();
    // 사유 카테고리(무의미/장난/욕설/오프토픽 등)를 드러내면 안 된다.
    expect(screen.queryByText(/무의미|장난|욕설|부적절|오프토픽|offtopic/i)).toBeNull();
  });

  test("액션 버튼은 '다시 입력' 단 하나뿐이다(우회 경로 없음)", () => {
    render(<InvalidInputDialog onClose={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("다시 입력");
  });

  test("버튼 클릭 시 onClose 가 호출된다(재입력)", async () => {
    const onClose = vi.fn();
    render(<InvalidInputDialog onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "다시 입력" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("role=dialog + aria-modal 인 차단 모달이다", () => {
    render(<InvalidInputDialog onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });
});
