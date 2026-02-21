// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./analytics-placeholder", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "analytics-placeholder" }),
}));

import AnalyticsPage from "./page";

describe("AnalyticsPage", () => {
  it("renders AnalyticsPlaceholder", () => {
    render(<AnalyticsPage />);
    expect(screen.getByTestId("analytics-placeholder")).toBeInTheDocument();
  });
});
