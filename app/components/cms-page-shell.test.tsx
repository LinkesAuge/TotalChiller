// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CmsPageShell from "./cms-page-shell";

vi.mock("./page-top-bar", () => ({
  __esModule: true,
  default: ({ title, breadcrumb }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "page-top-bar" }, breadcrumb, " | ", title);
  },
}));
vi.mock("./cms-shared", () => ({
  LoadingSkeleton: ({ rows }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "loading-skeleton" }, `Loading ${rows} rows`);
  },
  ErrorBanner: ({ message }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "error-banner" }, message);
  },
}));

describe("CmsPageShell", () => {
  it("shows loading skeleton when isLoaded=false", () => {
    render(
      <CmsPageShell title="Page" isLoaded={false} error={null}>
        Content
      </CmsPageShell>,
    );
    expect(screen.getByTestId("loading-skeleton")).toBeTruthy();
    expect(screen.queryByText("Content")).toBeNull();
  });

  it("shows children when isLoaded=true", () => {
    render(
      <CmsPageShell title="Page" isLoaded={true} error={null}>
        Content
      </CmsPageShell>,
    );
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.queryByTestId("loading-skeleton")).toBeNull();
  });

  it("shows error banner when error is set", () => {
    render(
      <CmsPageShell title="Page" isLoaded={true} error="Something broke">
        Content
      </CmsPageShell>,
    );
    expect(screen.getByTestId("error-banner")).toBeTruthy();
    expect(screen.getByText("Something broke")).toBeTruthy();
  });

  it("shows heroSlot when isLoaded=true", () => {
    render(
      <CmsPageShell title="Page" isLoaded={true} error={null} heroSlot={<div data-testid="hero">Hero</div>}>
        Content
      </CmsPageShell>,
    );
    expect(screen.getByTestId("hero")).toBeTruthy();
  });

  it("hides heroSlot when isLoaded=false", () => {
    render(
      <CmsPageShell title="Page" isLoaded={false} error={null} heroSlot={<div data-testid="hero">Hero</div>}>
        Content
      </CmsPageShell>,
    );
    expect(screen.queryByTestId("hero")).toBeNull();
  });

  it("applies contentClassName", () => {
    const { container } = render(
      <CmsPageShell title="Page" isLoaded={true} error={null} contentClassName="custom-class">
        Content
      </CmsPageShell>,
    );
    expect(container.querySelector(".content-inner.custom-class")).toBeTruthy();
  });
});
