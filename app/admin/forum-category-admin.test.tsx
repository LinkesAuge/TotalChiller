// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));

const mockFrom = vi.fn();
const stableSupabase = { from: mockFrom };

vi.mock("../hooks/use-supabase", () => ({
  useSupabase: () => stableSupabase,
}));

let mockClanContext: { clanId: string } | null = { clanId: "clan-1" };

vi.mock("../hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => mockClanContext,
}));

vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
});

import ForumCategoryAdmin from "./forum-category-admin";

const defaultCategories = [
  { id: "cat-1", name: "General", slug: "general", description: "General topics", sort_order: 1, clan_id: "clan-1" },
  { id: "cat-2", name: "Off-Topic", slug: "off-topic", description: null, sort_order: 2, clan_id: "clan-1" },
];

function setupMockFrom(categories = defaultCategories) {
  mockFrom.mockImplementation(() => {
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn().mockResolvedValue({ data: categories, error: null });
    return chain;
  });
}

describe("ForumCategoryAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClanContext = { clanId: "clan-1" };
    setupMockFrom();
    (globalThis.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it("shows selectClan message when no clan context", () => {
    mockClanContext = null;
    render(<ForumCategoryAdmin />);
    expect(screen.getByText("selectClan")).toBeInTheDocument();
  });

  it("renders category list when data loads", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => {
      expect(screen.getByText("General")).toBeInTheDocument();
    });
  });

  it("shows add category button", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => {
      expect(screen.getByText("addCategory")).toBeInTheDocument();
    });
  });

  it("shows noCategories when list is empty", async () => {
    mockFrom.mockImplementation(() => {
      const chain: any = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn().mockResolvedValue({ data: [], error: null });
      return chain;
    });
    render(<ForumCategoryAdmin />);
    await waitFor(() => {
      expect(screen.getByText("noCategories")).toBeInTheDocument();
    });
  });

  it("shows tablesNotReady when schema cache error occurs", async () => {
    mockFrom.mockImplementation(() => {
      const chain: any = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "schema cache lookup failed", code: "PGRST204" },
      });
      return chain;
    });
    render(<ForumCategoryAdmin />);
    await waitFor(() => {
      expect(screen.getByText("tablesNotReady")).toBeInTheDocument();
    });
  });

  /* ── Create form toggle ── */

  it("shows create form when add category button is clicked", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getByText("addCategory"));

    await waitFor(() => {
      expect(screen.getByText("newCategory")).toBeInTheDocument();
    });
  });

  it("toggles create form off when clicked again", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getByText("addCategory"));
    await waitFor(() => expect(screen.getByText("newCategory")).toBeInTheDocument());

    const cancelButtons = screen.getAllByText("cancel");
    fireEvent.click(cancelButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText("newCategory")).not.toBeInTheDocument();
    });
  });

  /* ── Create form submission ── */

  it("submits create form via POST fetch", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getByText("addCategory"));
    await waitFor(() => expect(screen.getByText("newCategory")).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/name \*/i);
    fireEvent.change(nameInput, { target: { value: "Announcements" } });

    const form = screen.getByText("createCategory").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      const postCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "POST");
      expect(postCalls.length).toBe(1);
      const body = JSON.parse(postCalls[0][1].body);
      expect(body.name).toBe("Announcements");
      expect(body.slug).toBe("announcements");
      expect(body.clan_id).toBe("clan-1");
    });
  });

  it("auto-generates slug from name with umlauts", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getByText("addCategory"));
    await waitFor(() => expect(screen.getByText("newCategory")).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/name \*/i);
    fireEvent.change(nameInput, { target: { value: "Über Grüße" } });

    const slugInput = screen.getByLabelText(/slug/i);
    expect((slugInput as HTMLInputElement).value).toBe("ueber-gruesse");
  });

  it("shows error when create POST fails", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Bad Request",
      json: () => Promise.resolve({ error: "Duplicate slug" }),
    });

    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getByText("addCategory"));
    await waitFor(() => expect(screen.getByText("newCategory")).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/name \*/i);
    fireEvent.change(nameInput, { target: { value: "Test" } });

    const form = screen.getByText("createCategory").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Duplicate slug/)).toBeInTheDocument();
    });
  });

  /* ── Edit inline ── */

  it("shows inline edit form when edit button is clicked", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    const editButtons = screen.getAllByLabelText("edit");
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByText("save")).toBeInTheDocument();
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("cancels edit when cancel is clicked", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    const editButtons = screen.getAllByLabelText("edit");
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("cancel"));
    });

    expect(screen.queryByText("save")).not.toBeInTheDocument();
  });

  it("saves edit via PATCH", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getAllByLabelText("edit")[0]);
    await waitFor(() => expect(screen.getByText("save")).toBeInTheDocument());

    fireEvent.click(screen.getByText("save"));

    await waitFor(() => {
      const patchCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "PATCH");
      expect(patchCalls.length).toBe(1);
      const body = JSON.parse(patchCalls[0][1].body);
      expect(body.id).toBe("cat-1");
      expect(body.name).toBe("General");
    });
  });

  it("shows error when edit PATCH fails", async () => {
    (globalThis.fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Server Error",
      json: () => Promise.resolve({ error: "Update failed" }),
    });

    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getAllByLabelText("edit")[0]);
    await waitFor(() => expect(screen.getByText("save")).toBeInTheDocument());

    fireEvent.click(screen.getByText("save"));

    await waitFor(() => {
      expect(screen.getByText(/Update failed/)).toBeInTheDocument();
    });
  });

  /* ── Delete flow ── */

  it("shows delete confirmation when delete button is clicked", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    const deleteButtons = screen.getAllByLabelText("delete");
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(screen.getByText("confirmDeleteText")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("DELETE General")).toBeInTheDocument();
  });

  it("delete button is disabled when phrase does not match", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    const deleteButtons = screen.getAllByLabelText("delete");
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    const deleteConfirmBtn = screen
      .getAllByText("delete")
      .find((el) => el.tagName === "BUTTON" && (el as HTMLButtonElement).disabled !== undefined);
    expect(deleteConfirmBtn).toBeTruthy();
  });

  it("submits delete via DELETE fetch when phrase matches", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getAllByLabelText("delete")[0]);
    await waitFor(() => expect(screen.getByPlaceholderText("DELETE General")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("DELETE General"), { target: { value: "DELETE General" } });

    const gameButtons = screen
      .getAllByRole("button")
      .filter((el) => el.textContent === "delete" && !(el as HTMLButtonElement).disabled);
    expect(gameButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(gameButtons[0]);

    await waitFor(() => {
      const deleteCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) => c[1]?.method === "DELETE");
      expect(deleteCalls.length).toBe(1);
      expect(deleteCalls[0][0]).toContain("id=cat-1");
    });
  });

  it("cancels delete confirmation", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    const deleteButtons = screen.getAllByLabelText("delete");
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(screen.getByText("confirmDeleteText")).toBeInTheDocument();

    const cancelBtn = screen.getByText("cancel");
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByText("confirmDeleteText")).not.toBeInTheDocument();
  });

  /* ── Status dismiss ── */

  it("dismisses status message when close button clicked", async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Err",
      json: () => Promise.resolve({ error: "Test error" }),
    });

    render(<ForumCategoryAdmin />);
    await waitFor(() => expect(screen.getByText("General")).toBeInTheDocument());

    fireEvent.click(screen.getByText("addCategory"));
    await waitFor(() => expect(screen.getByText("newCategory")).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/name \*/i);
    fireEvent.change(nameInput, { target: { value: "X" } });

    const form = screen.getByText("createCategory").closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => expect(screen.getByText(/Test error/)).toBeInTheDocument());
  });

  /* ── Category row with description ── */

  it("renders category description when present", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => {
      expect(screen.getByText("General topics")).toBeInTheDocument();
    });
  });

  it("renders slug next to name", async () => {
    render(<ForumCategoryAdmin />);
    await waitFor(() => {
      expect(screen.getByText("/general")).toBeInTheDocument();
    });
  });

  /* ── Loading state ── */

  it("shows loading state initially", () => {
    mockFrom.mockImplementation(() => {
      const chain: any = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.order = vi.fn().mockReturnValue(new Promise(() => {}));
      return chain;
    });
    render(<ForumCategoryAdmin />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });
});
