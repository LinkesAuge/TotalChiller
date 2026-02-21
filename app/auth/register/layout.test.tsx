// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterLayout from "./layout";

describe("RegisterLayout", () => {
  it("renders children", () => {
    render(
      <RegisterLayout>
        <div data-testid="child">Content</div>
      </RegisterLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
