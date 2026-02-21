// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./news-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "news-client" }),
}));

import NewsPage from "./page";

describe("NewsPage", () => {
  it("renders NewsClient", () => {
    render(<NewsPage />);
    expect(screen.getByTestId("news-client")).toBeInTheDocument();
  });
});
