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
vi.mock("./messages-client", () => ({
  __esModule: true,
  default: (props: any) =>
    require("react").createElement("div", {
      "data-testid": "messages-client",
      "data-user-id": props.userId,
    }),
}));

import MessagesPage from "./page";

describe("MessagesPage", () => {
  it("renders without crashing", async () => {
    const result = await MessagesPage({ searchParams: Promise.resolve({}) });
    const { container } = render(result);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders Suspense fallback or content", async () => {
    const result = await MessagesPage({ searchParams: Promise.resolve({}) });
    render(result);
    const skeleton = screen.queryByTestId("page-skeleton");
    const client = screen.queryByTestId("messages-client");
    expect(skeleton ?? client).toBeTruthy();
  });

  it("accepts search params", async () => {
    const result = await MessagesPage({
      searchParams: Promise.resolve({ to: "user123", tab: "compose" }),
    });
    const { container } = render(result);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});
