// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
}));

const MOCK_ASSET = {
  id: "a-1",
  filename: "banner.png",
  original_path: "/assets/banner.png",
  public_path: "/public/banner.png",
  category: "banner",
  tags: ["hero", "main"],
  width: 1920,
  height: 1080,
  file_size_bytes: 204800,
  notes: null,
  created_at: "2024-01-01",
};

const MOCK_ASSET_2 = {
  id: "a-2",
  filename: "icon.png",
  original_path: "/assets/icon.png",
  public_path: "/public/icon.png",
  category: "icon",
  tags: [],
  width: 64,
  height: 64,
  file_size_bytes: 1024,
  notes: null,
  created_at: "2024-01-02",
};

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import AssetLibraryTab from "./asset-library-tab";

describe("AssetLibraryTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [MOCK_ASSET], count: 1 }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders without crashing", () => {
    render(<AssetLibraryTab />);
    expect(document.querySelector("section")).toBeInTheDocument();
  });

  it("renders card title", () => {
    render(<AssetLibraryTab />);
    expect(screen.getByText("assetLibrary.title")).toBeInTheDocument();
  });

  it("renders card subtitle", () => {
    render(<AssetLibraryTab />);
    expect(screen.getByText("assetLibrary.assetsTotal")).toBeInTheDocument();
  });

  it("fetches assets on mount", () => {
    render(<AssetLibraryTab />);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/design-system/assets"));
  });

  it("renders asset thumbnails after loading", async () => {
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
  });

  it("renders category filter", () => {
    render(<AssetLibraryTab />);
    const selects = document.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading skeletons initially", () => {
    render(<AssetLibraryTab />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state when no assets returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], count: 0 }),
    });
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("assetLibrary.emptyMessage")).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("common.error")).toBeInTheDocument();
    });
  });

  it("shows retry button on error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("common.retry")).toBeInTheDocument();
    });
  });

  it("retries fetch on retry button click", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("common.retry")).toBeInTheDocument();
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [MOCK_ASSET], count: 1 }),
    });
    await act(async () => {
      fireEvent.click(screen.getByText("common.retry"));
    });
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
  });

  it("opens asset detail panel on asset click", async () => {
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("banner.png"));
    expect(screen.getByText("assetLibrary.dimensions")).toBeInTheDocument();
    expect(screen.getByText("assetLibrary.fileSize")).toBeInTheDocument();
    expect(screen.getByText("assetLibrary.originalPath")).toBeInTheDocument();
    expect(screen.getByText("assetLibrary.publicPath")).toBeInTheDocument();
  });

  it("shows tags in detail panel", async () => {
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("banner.png"));
    expect(screen.getByText("hero")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("closes detail panel on close button", async () => {
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("banner.png"));
    expect(screen.getByText("assetLibrary.dimensions")).toBeInTheDocument();
    fireEvent.click(screen.getByText("common.close"));
    expect(screen.queryByText("assetLibrary.dimensions")).toBeNull();
  });

  it("saves tags via API", async () => {
    mockFetch.mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === "PATCH") {
        return { ok: true, json: () => Promise.resolve({ ...MOCK_ASSET, tags: ["newtag"] }) };
      }
      return { ok: true, json: () => Promise.resolve({ data: [MOCK_ASSET], count: 1 }) };
    });
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("banner.png"));
    const tagsInput = screen.getByPlaceholderText("assetLibrary.tagsPlaceholder");
    fireEvent.change(tagsInput, { target: { value: "newtag" } });
    await act(async () => {
      fireEvent.click(screen.getByText("assetLibrary.saveTags"));
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/assets",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: "a-1", tags: ["newtag"] }),
      }),
    );
  });

  it("changes category via select in detail panel", async () => {
    mockFetch.mockImplementation(async (url: string, opts?: any) => {
      if (opts?.method === "PATCH") {
        return { ok: true, json: () => Promise.resolve({ ...MOCK_ASSET, category: "icon" }) };
      }
      return { ok: true, json: () => Promise.resolve({ data: [MOCK_ASSET], count: 1 }) };
    });
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("banner.png"));
    const selects = document.querySelectorAll("select");
    const catSelect = Array.from(selects).find((s) => (s as HTMLSelectElement).value === "banner");
    expect(catSelect).toBeTruthy();
    await act(async () => {
      fireEvent.change(catSelect!, { target: { value: "icon" } });
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/design-system/assets",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: "a-1", category: "icon" }),
      }),
    );
  });

  it("handles category filter change", async () => {
    render(<AssetLibraryTab />);
    const catSelect = document.querySelector("select") as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(catSelect, { target: { value: "banner" } });
    });
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("category=banner"));
    });
  });

  it("debounces search input", async () => {
    render(<AssetLibraryTab />);
    const searchInput = screen.getByPlaceholderText("assetLibrary.searchPlaceholder");
    fireEvent.change(searchInput, { target: { value: "test" } });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("search=test"));
    });
  });

  it("toggles dark/light background", async () => {
    render(<AssetLibraryTab />);
    await waitFor(() => {
      expect(screen.getByText("banner.png")).toBeInTheDocument();
    });
    const checkbox = screen.getByText("common.lightBg").closest("label")?.querySelector("input");
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);
  });
});
