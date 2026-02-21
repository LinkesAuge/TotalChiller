// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./analytics-overview", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "analytics-overview" }),
}));

import AnalyticsPage from "./page";

describe("AnalyticsPage", () => {
  it("renders AnalyticsOverview", () => {
    render(<AnalyticsPage />);
    expect(screen.getByTestId("analytics-overview")).toBeInTheDocument();
  });
});
