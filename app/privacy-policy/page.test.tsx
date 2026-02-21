// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./privacy-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "privacy-client" }),
}));

import PrivacyPolicyPage from "./page";

describe("PrivacyPolicyPage", () => {
  it("renders PrivacyClient", () => {
    render(<PrivacyPolicyPage />);
    expect(screen.getByTestId("privacy-client")).toBeInTheDocument();
  });
});
