// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(vi.fn((key: string) => key)),
  getLocale: vi.fn().mockResolvedValue("de"),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("../../lib/supabase/server-client", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "u1", email: "test@test.com" } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              user_db: "test_user",
              username: "testuser",
              display_name: "Test",
              default_game_account_id: null,
            },
          }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              user_db: "test_user",
              username: "testuser",
              display_name: "Test",
              default_game_account_id: null,
            },
          }),
        })),
      })),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null }),
  }),
}));
vi.mock("../components/page-shell", () => ({
  __esModule: true,
  default: ({ children }: any) => require("react").createElement("div", { "data-testid": "page-shell" }, children),
}));
vi.mock("./display-name-editor", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "display-name-editor" }),
}));
vi.mock("./game-account-manager", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "game-account-manager" }),
}));
vi.mock("@/app/admin/admin-types", () => ({
  buildFallbackUserDb: vi.fn(() => "fallback_user"),
  formatRole: vi.fn(() => "Member"),
}));

import ProfilePage from "./page";

describe("ProfilePage", () => {
  it("renders without crashing", () => {
    const { container } = render(<ProfilePage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders Suspense fallback skeleton", () => {
    render(<ProfilePage />);
    expect(document.querySelector(".skeleton")).toBeTruthy();
  });
});
