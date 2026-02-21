// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("../../../lib/supabase/server-client", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: true }),
  }),
}));
vi.mock("../../components/page-skeleton", () => ({
  __esModule: true,
  default: ({ variant }: any) =>
    require("react").createElement("div", {
      "data-testid": "page-skeleton",
      "data-variant": variant,
    }),
}));
vi.mock("./submission-detail-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "submission-detail-client" }),
}));

import SubmissionDetailPage from "./page";

describe("SubmissionDetailPage", () => {
  it("renders without crashing", () => {
    const { container } = render(<SubmissionDetailPage />);
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });

  it("renders Suspense fallback or content", () => {
    render(<SubmissionDetailPage />);
    const skeleton = screen.queryByTestId("page-skeleton");
    const client = screen.queryByTestId("submission-detail-client");
    expect(skeleton ?? client).toBeTruthy();
  });
});
