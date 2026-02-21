// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(vi.fn((key: string) => key)),
}));
vi.mock("./admin-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "admin-client" }),
}));
vi.mock("../components/auth-actions", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "auth-actions" }),
}));
vi.mock("./admin-section-badge", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "admin-badge" }),
}));
vi.mock("../components/page-top-bar", () => ({
  __esModule: true,
  default: ({ breadcrumb, title, actions }: any) =>
    require("react").createElement("div", { "data-testid": "page-top-bar" }, breadcrumb, title, actions),
}));
vi.mock("../components/section-hero", () => ({
  __esModule: true,
  default: ({ title, subtitle }: any) =>
    require("react").createElement("div", { "data-testid": "section-hero" }, title, subtitle),
}));
vi.mock("../components/page-skeleton", () => ({
  __esModule: true,
  default: ({ variant }: any) =>
    require("react").createElement("div", {
      "data-testid": "page-skeleton",
      "data-variant": variant,
    }),
}));

import AdminPage from "./page";

describe("AdminPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<AdminPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders Suspense fallback or content", () => {
    render(<AdminPage />);
    const skeleton = screen.queryByTestId("page-skeleton");
    const client = screen.queryByTestId("admin-client");
    expect(skeleton ?? client).toBeTruthy();
  });
});
