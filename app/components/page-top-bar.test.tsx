// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PageTopBar from "./page-top-bar";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

describe("PageTopBar", () => {
  it("renders the title as an h1", () => {
    render(<PageTopBar title="Dashboard" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dashboard");
  });

  it("renders the decorative header image", () => {
    render(<PageTopBar title="Page" />);
    expect(screen.getByRole("presentation")).toBeTruthy();
  });

  it("renders a breadcrumb when provided", () => {
    render(<PageTopBar title="Settings" breadcrumb="Admin" />);
    expect(screen.getByText("Admin")).toBeTruthy();
  });

  it("does not render breadcrumb when omitted", () => {
    const { container } = render(<PageTopBar title="Settings" />);
    expect(container.querySelector(".top-bar-breadcrumb")).toBeNull();
  });

  it("renders actions when provided", () => {
    render(<PageTopBar title="Page" actions={<button>Action</button>} />);
    expect(screen.getByRole("button", { name: "Action" })).toBeTruthy();
  });

  it("does not render actions slot when omitted", () => {
    const { container } = render(<PageTopBar title="Page" />);
    expect(container.querySelector(".flex.items-center.gap-3")).toBeNull();
  });
});
