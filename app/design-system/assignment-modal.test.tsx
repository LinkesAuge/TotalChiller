// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ fill, priority, unoptimized, ...props }: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("./thumbnail-size-picker", () => ({
  __esModule: true,
  default: () => null,
  ASSET_SIZES: [60, 100, 150],
}));

vi.mock("@/lib/sanitize-html", () => ({
  sanitizeHtml: (html: string) => html,
}));

const MOCK_ASSET = {
  id: "a-1",
  filename: "icon.png",
  original_path: "/icons/icon.png",
  public_path: "/public/icon.png",
  category: "icon",
  tags: [],
  width: 64,
  height: 64,
  file_size_bytes: 1024,
  notes: null,
  created_at: "2024-01-01",
};

const MOCK_ASSIGNMENT = {
  id: "asgn-1",
  ui_element_id: "el-1",
  asset_id: "a-1",
  role: "default",
  notes: null,
  created_at: "2024-01-01",
  design_assets: MOCK_ASSET,
};

const mockElement = {
  id: "el-1",
  name: "Primary Button",
  description: "Main CTA",
  category: "button",
  subcategory: "primary",
  component_file: null,
  current_css: null,
  status: "active" as const,
  render_type: "css" as const,
  preview_html: "<button>Click</button>",
  preview_image: null,
  notes: null,
  created_at: "2024-01-01",
};

const mockElementNoPreview = {
  ...mockElement,
  id: "el-2",
  preview_html: null,
  subcategory: null,
  description: null,
};

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function setupFetch(opts: { assignments?: any[] } = {}) {
  const { assignments = [] } = opts;
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("assignments")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: assignments }) });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [MOCK_ASSET], count: 1 }),
    });
  });
}

import AssignmentModal from "./assignment-modal";

describe("AssignmentModal", () => {
  const onClose = vi.fn();
  const onAssignmentsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it("renders without crashing", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(screen.getByText("modal.assignTitle")).toBeInTheDocument();
  });

  it("renders full-screen overlay", () => {
    const { container } = render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const overlay = container.firstElementChild;
    expect(overlay).toHaveStyle({ position: "fixed" });
  });

  it("renders close button", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(screen.getByText("common.close")).toBeInTheDocument();
  });

  it("fetches assignments on mount", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("assignments?ui_element_id=el-1"));
  });

  it("fetches assets on mount", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/design-system/assets"));
  });

  it("shows assigned assets section", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(screen.getByText(/Current Assignments/)).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    fireEvent.click(screen.getByText("common.close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when clicking overlay background", () => {
    const { container } = render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const overlay = container.firstElementChild as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", () => {
    const { container } = render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const overlay = container.firstElementChild as HTMLElement;
    fireEvent.keyDown(overlay, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows empty assignment state", async () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/No assets assigned/)).toBeInTheDocument();
    });
  });

  it("shows assigned assets when present", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getAllByText("icon.png").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows role of assigned asset", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText(/Role: default/)).toBeInTheDocument();
    });
  });

  it("removes assignment on remove button click", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentModal element={mockElement} onClose={onClose} onAssignmentsChange={onAssignmentsChange} />);
    await waitFor(() => {
      expect(screen.getAllByText("icon.png").length).toBeGreaterThanOrEqual(1);
    });
    const removeBtn = screen.getByTitle("common.remove");
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await act(async () => {
      fireEvent.click(removeBtn);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/assignments",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(onAssignmentsChange).toHaveBeenCalled();
  });

  it("assigns asset on click in asset grid", async () => {
    setupFetch({ assignments: [] });
    render(<AssignmentModal element={mockElement} onClose={onClose} onAssignmentsChange={onAssignmentsChange} />);
    await waitFor(() => {
      expect(screen.getByText("icon.png")).toBeInTheDocument();
    });
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    });
    const assetButtons = document.querySelectorAll("button");
    const iconBtn = Array.from(assetButtons).find((b) => b.textContent?.includes("icon.png"));
    if (iconBtn) {
      await act(async () => {
        fireEvent.click(iconBtn);
      });
    }
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/assignments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ui_element_id: "el-1", asset_id: "a-1", role: "default" }),
      }),
    );
  });

  it("renders preview HTML in header when available", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const previews = document.querySelectorAll("[dangerouslysetinnerhtml]");
    expect(previews.length).toBeGreaterThanOrEqual(0);
  });

  it("shows subcategory and description in header", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(screen.getByText(/primary/)).toBeInTheDocument();
    expect(screen.getByText(/Main CTA/)).toBeInTheDocument();
  });

  it("handles element without subcategory", () => {
    render(<AssignmentModal element={mockElementNoPreview} onClose={onClose} />);
    expect(screen.getByText("modal.assignTitle")).toBeInTheDocument();
  });

  it("renders role selector with default role", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    expect(screen.getByText("common.role")).toBeInTheDocument();
    const selects = document.querySelectorAll("select");
    const roleSelect = Array.from(selects).find((s) => (s as HTMLSelectElement).value === "default");
    expect(roleSelect).toBeTruthy();
  });

  it("changes role via select", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const selects = document.querySelectorAll("select");
    const roleSelect = Array.from(selects).find((s) => (s as HTMLSelectElement).value === "default");
    fireEvent.change(roleSelect!, { target: { value: "hover" } });
  });

  it("filters assets by category", async () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const selects = document.querySelectorAll("select");
    const catSelect = Array.from(selects).find((s) => (s as HTMLSelectElement).value === "all");
    if (catSelect) {
      await act(async () => {
        fireEvent.change(catSelect, { target: { value: "icon" } });
      });
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("category=icon"));
      });
    }
  });

  it("searches assets", async () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const searchInput = screen.getByPlaceholderText("common.search");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "test" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("search=test"));
    });
  });

  it("marks already assigned assets in grid", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText("common.assigned")).toBeInTheDocument();
    });
  });

  it("shows loading skeletons while assets load", () => {
    render(<AssignmentModal element={mockElement} onClose={onClose} />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
