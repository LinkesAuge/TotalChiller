// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./about-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "about-client" }),
}));

import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders AboutClient", () => {
    render(<AboutPage />);
    expect(screen.getByTestId("about-client")).toBeInTheDocument();
  });
});
