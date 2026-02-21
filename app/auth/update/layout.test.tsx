// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UpdatePasswordLayout from "./layout";

describe("UpdatePasswordLayout", () => {
  it("renders children", () => {
    render(
      <UpdatePasswordLayout>
        <div data-testid="child">Content</div>
      </UpdatePasswordLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
