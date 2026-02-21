// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
};
vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => mockSupabase,
}));

import DisplayNameEditor from "./display-name-editor";

describe("DisplayNameEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form with initial display name", () => {
    render(<DisplayNameEditor userId="u1" initialDisplayName="TestUser" email="test@example.com" />);
    expect(screen.getByLabelText("label")).toHaveValue("TestUser");
  });

  it("renders save button", () => {
    render(<DisplayNameEditor userId="u1" initialDisplayName="" email="test@example.com" />);
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("updates input value on change", () => {
    render(<DisplayNameEditor userId="u1" initialDisplayName="" email="test@example.com" />);
    const input = screen.getByLabelText("label");
    fireEvent.change(input, { target: { value: "NewName" } });
    expect(input).toHaveValue("NewName");
  });

  it("does not show status message initially", () => {
    render(<DisplayNameEditor userId="u1" initialDisplayName="" email="test@example.com" />);
    expect(screen.queryByText("updating")).not.toBeInTheDocument();
    expect(screen.queryByText("updated")).not.toBeInTheDocument();
  });
});
