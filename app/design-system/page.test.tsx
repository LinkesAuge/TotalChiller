// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(vi.fn((key: string) => key)),
}));
vi.mock("../components/page-shell", () => ({
  __esModule: true,
  default: ({ children }: any) => require("react").createElement("div", { "data-testid": "page-shell" }, children),
}));
vi.mock("../components/page-skeleton", () => ({
  __esModule: true,
  default: ({ variant }: any) =>
    require("react").createElement("div", {
      "data-testid": "page-skeleton",
      "data-variant": variant,
    }),
}));
vi.mock("./design-system-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "design-system-client" }),
}));

import DesignSystemPage from "./page";

describe("DesignSystemPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<DesignSystemPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders Suspense fallback or content", () => {
    render(<DesignSystemPage />);
    const skeleton = screen.queryByTestId("page-skeleton");
    const client = screen.queryByTestId("design-system-client");
    expect(skeleton ?? client).toBeTruthy();
  });
});
