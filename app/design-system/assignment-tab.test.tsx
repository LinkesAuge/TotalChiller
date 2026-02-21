// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
  useLocale: vi.fn(() => "de"),
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
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
  UI_ELEMENT_SIZES: [60, 90, 120],
}));

const MOCK_ELEMENT = {
  id: "el-1",
  name: "Button",
  category: "button",
  status: "active",
  render_type: "asset",
  description: "Primary button",
  subcategory: null,
  component_file: null,
  current_css: null,
  preview_html: null,
  preview_image: null,
  notes: null,
  created_at: "2024-01-01",
};

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

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function setupFetch(opts: { assignments?: any[] } = {}) {
  const { assignments = [] } = opts;
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("ui-elements")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [MOCK_ELEMENT] }),
      });
    }
    if (url.includes("assignments")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: assignments }),
      });
    }
    if (url.includes("assets")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [MOCK_ASSET], count: 1 }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

import AssignmentTab from "./assignment-tab";

describe("AssignmentTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it("renders without crashing", () => {
    render(<AssignmentTab />);
    expect(document.querySelector("section")).not.toBeNull();
  });

  it("renders card title", () => {
    render(<AssignmentTab />);
    expect(screen.getByText("assignments.title")).toBeInTheDocument();
  });

  it("renders card subtitle", () => {
    render(<AssignmentTab />);
    expect(screen.getByText("assignments.subtitle")).toBeInTheDocument();
  });

  it("fetches UI elements on mount", () => {
    render(<AssignmentTab />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/design-system/ui-elements"));
  });

  it("fetches assets on mount", () => {
    render(<AssignmentTab />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/design-system/assets"));
  });

  it("renders role selector", () => {
    render(<AssignmentTab />);
    expect(screen.getByText("common.role")).toBeInTheDocument();
  });

  it("shows select prompt when no element selected", async () => {
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("assignments.selectPrompt")).toBeInTheDocument();
    });
  });

  it("renders element list after loading", async () => {
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
  });

  it("shows element description", async () => {
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary button")).toBeInTheDocument();
    });
  });

  it("selects element on click", async () => {
    setupFetch({ assignments: [] });
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Button"));
    });
    await waitFor(() => {
      expect(screen.getByText("assignments.noAssetsAssigned")).toBeInTheDocument();
    });
  });

  it("shows assigned asset count for selected element", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Button"));
    });
    await waitFor(() => {
      expect(screen.getByText("assignments.assignedAssets")).toBeInTheDocument();
    });
  });

  it("shows assignment details with filename and role", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Button"));
    });
    await waitFor(() => {
      expect(screen.getAllByText("icon.png").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("assigns asset on click in asset grid", async () => {
    setupFetch({ assignments: [] });
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Button"));
    });
    await waitFor(() => {
      expect(screen.getAllByText("icon.png").length).toBeGreaterThanOrEqual(1);
    });
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return (
        setupFetch({ assignments: [MOCK_ASSIGNMENT] }),
        Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
      );
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
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("removes assignment on remove button click", async () => {
    setupFetch({ assignments: [MOCK_ASSIGNMENT] });
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("Button")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("Button"));
    });
    await waitFor(() => {
      expect(screen.getAllByText("icon.png").length).toBeGreaterThanOrEqual(1);
    });
    const removeBtn = screen.getByTitle("assignments.removeAssignment");
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await act(async () => {
      fireEvent.click(removeBtn);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/assignments",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("changes assignment role via select", () => {
    render(<AssignmentTab />);
    const selects = document.querySelectorAll("select");
    const roleSelect = Array.from(selects).find((s) => (s as HTMLSelectElement).value === "default");
    expect(roleSelect).toBeTruthy();
    fireEvent.change(roleSelect!, { target: { value: "hover" } });
    expect((roleSelect as HTMLSelectElement).value).toBe("hover");
  });

  it("filters elements by category", async () => {
    render(<AssignmentTab />);
    const selects = document.querySelectorAll("select");
    const catSelect = selects[1];
    await act(async () => {
      fireEvent.change(catSelect!, { target: { value: "button" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("category=button"));
    });
  });

  it("filters elements by search", async () => {
    render(<AssignmentTab />);
    const searchInputs = document.querySelectorAll("input[type='text']");
    const elementSearch = searchInputs[0];
    await act(async () => {
      fireEvent.change(elementSearch!, { target: { value: "test" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("search=test"));
    });
  });

  it("shows dash placeholder when element has no assignments", async () => {
    setupFetch({ assignments: [] });
    render(<AssignmentTab />);
    await waitFor(() => {
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
