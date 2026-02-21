// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(vi.fn((key: string) => key)),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("../../lib/supabase/server-client", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
    },
  }),
}));
vi.mock("../components/page-shell", () => ({
  __esModule: true,
  default: ({ children }: any) => require("react").createElement("div", { "data-testid": "page-shell" }, children),
}));
vi.mock("../components/page-skeleton", () => ({
  __esModule: true,
  default: ({ variant }: any) =>
    require("react").createElement("div", { "data-testid": "page-skeleton", "data-variant": variant }),
}));
vi.mock("./settings-client", () => ({
  __esModule: true,
  default: (props: any) =>
    require("react").createElement("div", {
      "data-testid": "settings-client",
      "data-user-id": props.userId,
    }),
}));

import SettingsPage from "./page";

describe("SettingsPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<SettingsPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders Suspense fallback or content", () => {
    render(<SettingsPage />);
    const skeleton = screen.queryByTestId("page-skeleton");
    const client = screen.queryByTestId("settings-client");
    expect(skeleton ?? client).toBeTruthy();
  });
});
