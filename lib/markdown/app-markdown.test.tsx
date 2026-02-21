// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "react-markdown" }, children);
  },
}));
vi.mock("remark-gfm", () => ({ __esModule: true, default: vi.fn() }));
vi.mock("remark-breaks", () => ({ __esModule: true, default: vi.fn() }));
vi.mock("./sanitize-markdown", () => ({
  sanitizeMarkdown: vi.fn((content: string) => content),
}));
vi.mock("./renderers", () => ({
  buildMarkdownComponents: vi.fn(() => ({})),
  buildPreviewComponents: vi.fn(() => ({})),
}));

import AppMarkdown from "./app-markdown";
import { sanitizeMarkdown } from "./sanitize-markdown";
import { buildMarkdownComponents, buildPreviewComponents } from "./renderers";

describe("AppMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with forum-md class by default", () => {
    const { container } = render(<AppMarkdown content="Hello" />);
    expect(container.firstChild).toHaveClass("forum-md");
  });

  it("renders with cms-md class when variant='cms'", () => {
    const { container } = render(<AppMarkdown content="Hello" variant="cms" />);
    expect(container.firstChild).toHaveClass("cms-md");
  });

  it("passes content to ReactMarkdown", () => {
    render(<AppMarkdown content="Test content" />);
    expect(screen.getByTestId("react-markdown")).toHaveTextContent("Test content");
  });

  it("adds additional className when provided", () => {
    const { container } = render(<AppMarkdown content="Hello" className="extra" />);
    expect(container.firstChild).toHaveClass("forum-md");
    expect(container.firstChild).toHaveClass("extra");
  });

  it("applies preview class in preview mode", () => {
    const { container } = render(<AppMarkdown content="Hello" preview />);
    expect(container.firstChild).toHaveClass("forum-md");
    expect(container.firstChild).toHaveClass("forum-md-preview");
  });

  it("calls buildPreviewComponents in preview mode", () => {
    render(<AppMarkdown content="Hello" preview />);
    expect(buildPreviewComponents).toHaveBeenCalledWith("forum-md");
    expect(buildMarkdownComponents).not.toHaveBeenCalled();
  });

  it("calls buildMarkdownComponents in normal mode", () => {
    render(<AppMarkdown content="Hello" />);
    expect(buildMarkdownComponents).toHaveBeenCalledWith("forum-md", undefined);
    expect(buildPreviewComponents).not.toHaveBeenCalled();
  });

  it("truncates content in preview mode", () => {
    const longContent = "A".repeat(300);
    render(<AppMarkdown content={longContent} preview previewLength={50} />);
    const md = screen.getByTestId("react-markdown");
    expect(md.textContent!.length).toBeLessThan(longContent.length);
    expect(md.textContent).toContain("…");
  });

  it("calls sanitizeMarkdown with content", () => {
    render(<AppMarkdown content="raw **md**" />);
    expect(sanitizeMarkdown).toHaveBeenCalledWith("raw **md**");
  });
});
