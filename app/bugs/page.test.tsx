// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./bugs-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "bugs-client" }),
}));

import BugsPage from "./page";

describe("BugsPage", () => {
  it("renders BugsClient", () => {
    render(<BugsPage />);
    expect(screen.getByTestId("bugs-client")).toBeInTheDocument();
  });
});
