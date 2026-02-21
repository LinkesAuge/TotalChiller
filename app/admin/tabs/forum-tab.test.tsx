// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

vi.mock("../forum-category-admin", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "forum-category-admin" }, "ForumCategoryAdmin");
  },
}));

import ForumTab from "./forum-tab";

describe("ForumTab", () => {
  it("renders without crashing", () => {
    render(<ForumTab />);
    expect(screen.getByText("forum.title")).toBeInTheDocument();
  });

  it("shows subtitle", () => {
    render(<ForumTab />);
    expect(screen.getByText("forum.subtitle")).toBeInTheDocument();
  });

  it("renders ForumCategoryAdmin component", () => {
    render(<ForumTab />);
    expect(screen.getByTestId("forum-category-admin")).toBeInTheDocument();
  });

  it("wraps content in a card section", () => {
    const { container } = render(<ForumTab />);
    expect(container.querySelector("section.card")).toBeInTheDocument();
  });
});
