// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./events-client", () => ({
  __esModule: true,
  default: () => require("react").createElement("div", { "data-testid": "events-client" }),
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders EventsClient", () => {
    render(<EventsPage />);
    expect(screen.getByTestId("events-client")).toBeInTheDocument();
  });
});
