// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./home-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "home-client" }),
}));

import HomePage from "./page";

describe("HomePage", () => {
  it("renders HomeClient", async () => {
    const result = await HomePage();
    render(result);
    expect(screen.getByTestId("home-client")).toBeInTheDocument();
  });
});
