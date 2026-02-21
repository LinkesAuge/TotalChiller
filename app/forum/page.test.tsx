// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./forum-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "forum-client" }),
}));

import ForumPage from "./page";

describe("ForumPage", () => {
  it("renders ForumClient", () => {
    render(<ForumPage />);
    expect(screen.getByTestId("forum-client")).toBeInTheDocument();
  });
});
