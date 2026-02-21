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
  UI_ELEMENT_SIZES: [60, 90, 120],
}));

vi.mock("./assignment-modal", () => ({
  __esModule: true,
  default: ({ element, onClose }: any) => {
    const React = require("react");
    return React.createElement(
      "div",
      { "data-testid": "assignment-modal" },
      React.createElement("span", null, element.name),
      React.createElement("button", { onClick: onClose, "data-testid": "close-modal" }, "Close"),
    );
  },
}));

vi.mock("@/lib/sanitize-html", () => ({
  sanitizeHtml: (html: string) => html,
}));

const MOCK_ELEMENT_CSS = {
  id: "el-1",
  name: "Primary Button",
  description: "Main CTA button",
  category: "button",
  subcategory: null,
  component_file: null,
  current_css: ".btn-primary",
  status: "active",
  render_type: "css",
  preview_html: "<button>Click</button>",
  preview_image: null,
  notes: "Important element",
  created_at: "2024-01-01",
};

const MOCK_ELEMENT_ASSET = {
  id: "el-2",
  name: "Hero Banner",
  description: null,
  category: "banner",
  subcategory: "hero",
  component_file: "components/hero.tsx",
  current_css: null,
  status: "planned",
  render_type: "asset",
  preview_html: null,
  preview_image: "/preview/hero.png",
  notes: null,
  created_at: "2024-01-02",
};

const MOCK_ELEMENT_COMPOSITE = {
  id: "el-3",
  name: "Card Layout",
  description: null,
  category: "card",
  subcategory: null,
  component_file: null,
  current_css: null,
  status: "deprecated",
  render_type: "composite",
  preview_html: null,
  preview_image: null,
  notes: null,
  created_at: "2024-01-03",
};

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function setupFetch(elements = [MOCK_ELEMENT_CSS]) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("ui-elements")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: elements, count: elements.length }),
      });
    }
    if (url.includes("assignments")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

import UiInventoryTab from "./ui-inventory-tab";

describe("UiInventoryTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });

  it("renders without crashing", () => {
    render(<UiInventoryTab />);
    expect(document.querySelector("section")).toBeInTheDocument();
  });

  it("renders the inventory title", () => {
    render(<UiInventoryTab />);
    expect(screen.getByText("uiInventory.title")).toBeInTheDocument();
  });

  it("fetches elements on mount", () => {
    render(<UiInventoryTab />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/design-system/ui-elements"));
  });

  it("renders element cards after loading", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
    });
  });

  it("renders add element button", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("uiInventory.addElement")).toBeInTheDocument();
    });
  });

  it("shows loading skeletons initially", () => {
    render(<UiInventoryTab />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty message when no elements", async () => {
    setupFetch([]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("uiInventory.emptyMessage")).toBeInTheDocument();
    });
  });

  it("shows error state", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });

  it("shows retry button on error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  it("renders element description", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Main CTA button")).toBeInTheDocument();
    });
  });

  it("renders inline HTML preview for css elements", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
    });
    const previewScope = document.querySelector(".inline-preview-scope");
    expect(previewScope).toBeInTheDocument();
  });

  it("renders screenshot preview for elements with preview_image", async () => {
    setupFetch([MOCK_ELEMENT_ASSET]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Hero Banner")).toBeInTheDocument();
    });
    const previewImg = screen.getByAltText("Hero Banner preview");
    expect(previewImg).toBeInTheDocument();
  });

  it("renders empty preview for composite elements", async () => {
    setupFetch([MOCK_ELEMENT_COMPOSITE]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Card Layout")).toBeInTheDocument();
    });
    expect(screen.getByText("uiInventory.uploadScreenshot")).toBeInTheDocument();
  });

  it("renders subcategory when present", async () => {
    setupFetch([MOCK_ELEMENT_ASSET]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("(hero)")).toBeInTheDocument();
    });
  });

  it("renders component file info", async () => {
    setupFetch([MOCK_ELEMENT_ASSET]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText(/components\/hero\.tsx/)).toBeInTheDocument();
    });
  });

  it("renders CSS class info", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText(".btn-primary")).toBeInTheDocument();
    });
  });

  it("renders notes", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Important element")).toBeInTheDocument();
    });
  });

  it("opens add form on button click", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("uiInventory.addElement")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("uiInventory.addElement"));
    expect(screen.getByText("common.cancel")).toBeInTheDocument();
    expect(screen.getByText("Add Element")).toBeInTheDocument();
  });

  it("submits add form", async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [MOCK_ELEMENT_CSS], count: 1 }),
      });
    });
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("uiInventory.addElement")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("uiInventory.addElement"));
    const nameInput = screen.getByPlaceholderText("uiInventory.namePlaceholder");
    fireEvent.change(nameInput, { target: { value: "New Element" } });
    await act(async () => {
      fireEvent.click(screen.getByText("Add Element"));
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/ui-elements",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("opens edit mode on edit button click", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("common.edit"));
    expect(screen.getByText("common.save")).toBeInTheDocument();
    expect(screen.getByText("common.cancel")).toBeInTheDocument();
  });

  it("cancels edit mode", async () => {
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("common.edit"));
    fireEvent.click(screen.getByText("common.cancel"));
    expect(screen.queryByText("common.save")).toBeNull();
  });

  it("saves edit", async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "PATCH") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [MOCK_ELEMENT_CSS], count: 1 }),
      });
    });
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("common.edit"));
    await act(async () => {
      fireEvent.click(screen.getByText("common.save"));
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/ui-elements",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deletes element on delete button click", async () => {
    mockFetch.mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [MOCK_ELEMENT_CSS], count: 1 }),
      });
    });
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByText("common.delete"));
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/ui-elements",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("filters by category", async () => {
    render(<UiInventoryTab />);
    const selects = document.querySelectorAll("select");
    const catSelect = selects[0];
    await act(async () => {
      fireEvent.change(catSelect!, { target: { value: "button" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("category=button"));
    });
  });

  it("filters by status", async () => {
    render(<UiInventoryTab />);
    const selects = document.querySelectorAll("select");
    const statusSelect = selects[1];
    await act(async () => {
      fireEvent.change(statusSelect!, { target: { value: "active" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("status=active"));
    });
  });

  it("filters by render type", async () => {
    render(<UiInventoryTab />);
    const selects = document.querySelectorAll("select");
    const rtSelect = selects[2];
    await act(async () => {
      fireEvent.change(rtSelect!, { target: { value: "css" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("render_type=css"));
    });
  });

  it("filters by search text", async () => {
    render(<UiInventoryTab />);
    const searchInput = screen.getByPlaceholderText("uiInventory.searchPlaceholder");
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "button" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("search=button"));
    });
  });

  it("groups elements by category", async () => {
    setupFetch([MOCK_ELEMENT_CSS, MOCK_ELEMENT_ASSET]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Primary Button")).toBeInTheDocument();
      expect(screen.getByText("Hero Banner")).toBeInTheDocument();
    });
    const categoryHeaders = document.querySelectorAll(".ui-inventory-category-header");
    expect(categoryHeaders.length).toBe(2);
  });

  it("opens assignment modal for assignable elements", async () => {
    setupFetch([MOCK_ELEMENT_ASSET]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Hero Banner")).toBeInTheDocument();
    });
    const assignBtn = screen.getByText(/uiInventory\.assignAssets/);
    fireEvent.click(assignBtn);
    expect(screen.getByTestId("assignment-modal")).toBeInTheDocument();
  });

  it("closes assignment modal", async () => {
    setupFetch([MOCK_ELEMENT_ASSET]);
    render(<UiInventoryTab />);
    await waitFor(() => {
      expect(screen.getByText("Hero Banner")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/uiInventory\.assignAssets/));
    expect(screen.getByTestId("assignment-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("close-modal"));
    expect(screen.queryByTestId("assignment-modal")).toBeNull();
  });
});
