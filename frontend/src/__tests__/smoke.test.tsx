import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("test infra smoke", () => {
  test("jsdom + @testing-library/react 환경에서 컴포넌트 렌더 가능", () => {
    function Hello({ name }: { name: string }) {
      return <div>Hello, {name}!</div>;
    }
    render(<Hello name="World" />);
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });
});
