// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./contact-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "contact-client" }),
}));

import ContactPage from "./page";

describe("ContactPage", () => {
  it("renders ContactClient", () => {
    render(<ContactPage />);
    expect(screen.getByTestId("contact-client")).toBeInTheDocument();
  });
});
