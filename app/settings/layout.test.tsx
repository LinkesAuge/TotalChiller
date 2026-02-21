// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsLayout from "./layout";

describe("SettingsLayout", () => {
  it("renders children", () => {
    render(
      <SettingsLayout>
        <div data-testid="child">Content</div>
      </SettingsLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
