import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { QaChoices } from "./Learn";

describe("QaChoices", () => {
  test("질문과 연결된 숫자 radio로 단일 답변을 선택하고 잠근다", () => {
    const onSelect = vi.fn();
    const choices = ["상태 객체", "1MB 콜스택", "일시중단"];
    const view = (value = "", locked = false) => (
      <>
        <span id="question-1-1">코루틴의 특징이 아닌 것은?</span>
        <QaChoices
          name="answer-1-1"
          labelledBy="question-1-1"
          choices={choices}
          value={value}
          locked={locked}
          onSelect={onSelect}
        />
      </>
    );

    const { rerender } = render(view());
    expect(screen.getByRole("radiogroup", { name: "코루틴의 특징이 아닌 것은?" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith("2. 1MB 콜스택");

    rerender(view("2. 1MB 콜스택", true));
    expect(screen.getAllByRole("radio")[1]).toBeChecked();
    expect(screen.getAllByRole("radio").every((radio) => radio.hasAttribute("disabled"))).toBe(true);
  });
});
