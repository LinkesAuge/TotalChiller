// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginLayout from "./layout";

describe("LoginLayout", () => {
  it("renders children", () => {
    render(
      <LoginLayout>
        <div data-testid="child">Content</div>
      </LoginLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
