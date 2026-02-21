// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(vi.fn((key: string) => key)),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => require("react").createElement("a", props, children),
}));
vi.mock("../components/page-shell", () => ({
  __esModule: true,
  default: ({ children, title }: any) =>
    require("react").createElement(
      "div",
      { "data-testid": "page-shell" },
      require("react").createElement("h1", null, title),
      children,
    ),
}));

import NotAuthorizedPage from "./page";

describe("NotAuthorizedPage", () => {
  it("renders default unauthorized message", async () => {
    const result = await NotAuthorizedPage({
      searchParams: Promise.resolve({}),
    });
    render(result);
    expect(screen.getByText("message")).toBeInTheDocument();
    expect(screen.getByText("goHome")).toBeInTheDocument();
    expect(screen.getByText("goProfile")).toBeInTheDocument();
  });

  it("renders admin-specific message when reason is admin", async () => {
    const result = await NotAuthorizedPage({
      searchParams: Promise.resolve({ reason: "admin" }),
    });
    render(result);
    expect(screen.getByText("adminMessage")).toBeInTheDocument();
    expect(screen.getByText("goHome")).toBeInTheDocument();
    expect(screen.queryByText("goProfile")).not.toBeInTheDocument();
  });

  it("renders page title", async () => {
    const result = await NotAuthorizedPage({
      searchParams: Promise.resolve({}),
    });
    render(result);
    expect(screen.getByText("title")).toBeInTheDocument();
  });
});
