// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ForgotPasswordLayout from "./layout";

describe("ForgotPasswordLayout", () => {
  it("renders children", () => {
    render(
      <ForgotPasswordLayout>
        <div data-testid="child">Content</div>
      </ForgotPasswordLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
