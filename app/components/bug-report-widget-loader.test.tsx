// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BugReportWidgetLoader from "./bug-report-widget-loader";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return function MockBugReportWidget() {
      return React.createElement("div", { "data-testid": "bug-report-widget" }, "Bug Widget");
    };
  },
}));

describe("BugReportWidgetLoader", () => {
  it("renders the dynamically loaded BugReportWidget", () => {
    render(<BugReportWidgetLoader />);
    expect(screen.getByTestId("bug-report-widget")).toBeTruthy();
  });
});
