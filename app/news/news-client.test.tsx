// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("a", props, children);
  },
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any, opts?: any) => {
    if (opts?.loading) opts.loading();
    const React = require("react");
    return (props: any) => React.createElement("div", { "data-testid": "app-markdown" }, props.content);
  },
}));

vi.mock("../components/page-shell", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "page-shell" }, children);
  },
}));
vi.mock("../components/data-state", () => ({
  __esModule: true,
  default: ({ children, isLoading, isEmpty, loadingMessage, emptyMessage }: any) => {
    const React = require("react");
    if (isLoading) return React.createElement("div", null, loadingMessage);
    if (isEmpty) return React.createElement("div", null, emptyMessage);
    return React.createElement("div", { "data-testid": "data-state" }, children);
  },
}));
vi.mock("../components/pagination-bar", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "pagination" });
  },
}));
vi.mock("../components/confirm-modal", () => ({
  __esModule: true,
  default: ({ isOpen, title, onConfirm, onCancel }: any) => {
    const React = require("react");
    if (!isOpen) return null;
    return React.createElement(
      "div",
      { "data-testid": "confirm-modal" },
      React.createElement("span", null, title),
      React.createElement("button", { onClick: onConfirm, "data-testid": "confirm-btn" }, "Confirm"),
      React.createElement("button", { onClick: onCancel, "data-testid": "cancel-btn" }, "Cancel"),
    );
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));
vi.mock("../components/ui/radix-select", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("select", { "data-testid": "radix-select" });
  },
}));
vi.mock("../components/date-picker", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("input", { "data-testid": "date-picker", type: "date" });
  },
}));
vi.mock("../components/ui/search-input", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("input", { "data-testid": "search-input" });
  },
}));
vi.mock("../components/ui/game-icon", () => ({
  __esModule: true,
  default: ({ name }: any) => {
    const React = require("react");
    return React.createElement("span", { "data-testid": `game-icon-${name}` });
  },
}));
vi.mock("./news-form", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "news-form" });
  },
}));

const mockUseNews = vi.fn();
vi.mock("./use-news", () => ({
  useNews: (...args: any[]) => mockUseNews(...args),
}));

import NewsClient from "./news-client";

const sampleArticle = {
  id: "a1",
  title: "Test Article",
  content: "Content here",
  created_at: "2025-01-01T00:00:00Z",
  author_name: "Author",
  editor_name: null as string | null,
  updated_at: null as string | null,
  is_pinned: false,
  status: "published",
  tags: [] as string[],
  banner_url: null as string | null,
  forum_post_id: null as string | null,
};

function baseNewsState(overrides: Record<string, any> = {}) {
  return {
    articles: [],
    isLoading: false,
    pagination: { page: 1, setPage: vi.fn(), totalItems: 0, pageSize: 10, totalPages: 0 },
    isFiltersOpen: false,
    setIsFiltersOpen: vi.fn(),
    tagFilter: "all",
    searchTerm: "",
    dateFrom: "",
    dateTo: "",
    availableTags: [],
    hasActiveFilters: false,
    editFormRef: { current: null },
    isFormOpen: false,
    isSaving: false,
    editingId: null,
    formValues: { title: "", content: "", status: "draft", isPinned: false, tagsInput: "", bannerUrl: "" },
    isBannerUploading: false,
    bannerFileRef: { current: null },
    expandedArticleId: "",
    setExpandedArticleId: vi.fn(),
    deletingArticleId: "",
    setDeletingArticleId: vi.fn(),
    canManage: false,
    currentUserId: "u1",
    supabase: {},
    handleOpenCreate: vi.fn(),
    handleEditArticle: vi.fn(),
    handleFieldChange: vi.fn(),
    handleBannerUpload: vi.fn(),
    handleSubmit: vi.fn(),
    resetForm: vi.fn(),
    handleConfirmDeleteArticle: vi.fn(),
    handleClearFilters: vi.fn(),
    handleSearchTermChange: vi.fn(),
    handleTagFilterChange: vi.fn(),
    handleDateFromChange: vi.fn(),
    handleDateToChange: vi.fn(),
    ...overrides,
  };
}

describe("NewsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNews.mockReturnValue(baseNewsState());
  });

  // ── Loading / Empty ──

  it("renders loading state", () => {
    mockUseNews.mockReturnValue(baseNewsState({ isLoading: true }));
    render(<NewsClient />);
    expect(screen.getByText("loadingNews")).toBeInTheDocument();
  });

  it("renders empty state when no articles", () => {
    render(<NewsClient />);
    expect(screen.getByText("noNews")).toBeInTheDocument();
  });

  // ── Create button ──

  it("does not show create button when canManage is false", () => {
    render(<NewsClient />);
    expect(screen.queryByText("createPost")).not.toBeInTheDocument();
  });

  it("shows create button when canManage is true", () => {
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true }));
    render(<NewsClient />);
    expect(screen.getByText("createPost")).toBeInTheDocument();
  });

  it("hides create button when form is already open", () => {
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, isFormOpen: true }));
    render(<NewsClient />);
    expect(screen.queryByText("createPost")).not.toBeInTheDocument();
  });

  it("calls handleOpenCreate when create button is clicked", () => {
    const handleOpenCreate = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, handleOpenCreate }));
    render(<NewsClient />);
    fireEvent.click(screen.getByText("createPost"));
    expect(handleOpenCreate).toHaveBeenCalled();
  });

  // ── Filter toggle ──

  it("renders filter toggle button", () => {
    render(<NewsClient />);
    expect(screen.getByText("filters")).toBeInTheDocument();
  });

  it("calls setIsFiltersOpen when filter toggle is clicked", () => {
    const setIsFiltersOpen = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ setIsFiltersOpen }));
    render(<NewsClient />);
    fireEvent.click(screen.getByText("filters"));
    expect(setIsFiltersOpen).toHaveBeenCalled();
  });

  it("renders filter panel when isFiltersOpen is true", () => {
    mockUseNews.mockReturnValue(baseNewsState({ isFiltersOpen: true }));
    render(<NewsClient />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getAllByTestId("date-picker").length).toBe(2);
  });

  it("does not render filter panel when isFiltersOpen is false", () => {
    render(<NewsClient />);
    expect(screen.queryByTestId("search-input")).not.toBeInTheDocument();
  });

  it("shows tag filter when availableTags has entries", () => {
    mockUseNews.mockReturnValue(baseNewsState({ isFiltersOpen: true, availableTags: ["Update", "Bug"] }));
    render(<NewsClient />);
    expect(screen.getByTestId("radix-select")).toBeInTheDocument();
  });

  it("does not show tag filter when availableTags is empty", () => {
    mockUseNews.mockReturnValue(baseNewsState({ isFiltersOpen: true }));
    render(<NewsClient />);
    expect(screen.queryByTestId("radix-select")).not.toBeInTheDocument();
  });

  // ── Active filters ──

  it("shows clear filters button when active filters exist", () => {
    mockUseNews.mockReturnValue(baseNewsState({ hasActiveFilters: true }));
    render(<NewsClient />);
    expect(screen.getByText("clearFilters")).toBeInTheDocument();
  });

  it("does not show clear filters button when no active filters", () => {
    render(<NewsClient />);
    expect(screen.queryByText("clearFilters")).not.toBeInTheDocument();
  });

  it("calls handleClearFilters when clear button is clicked", () => {
    const handleClearFilters = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ hasActiveFilters: true, handleClearFilters }));
    render(<NewsClient />);
    fireEvent.click(screen.getByText("clearFilters"));
    expect(handleClearFilters).toHaveBeenCalled();
  });

  it("shows filter badge indicator when hasActiveFilters", () => {
    const { container } = render(<NewsClient />);
    expect(container.querySelector(".news-filter-badge")).not.toBeTruthy();
    mockUseNews.mockReturnValue(baseNewsState({ hasActiveFilters: true }));
    const { container: c2 } = render(<NewsClient />);
    expect(c2.querySelector(".news-filter-badge")).toBeTruthy();
  });

  // ── Article rendering ──

  it("renders articles with titles", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    render(<NewsClient />);
    expect(screen.getByText("Test Article")).toBeInTheDocument();
  });

  it("renders article author name in meta", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    const { container } = render(<NewsClient />);
    const meta = container.querySelector(".news-card-meta");
    expect(meta?.textContent).toContain("author");
  });

  it("renders editor info when editor_name and updated_at are present", () => {
    const editedArticle = { ...sampleArticle, editor_name: "Editor", updated_at: "2025-01-02T00:00:00Z" };
    mockUseNews.mockReturnValue(baseNewsState({ articles: [editedArticle] }));
    const { container } = render(<NewsClient />);
    const edited = container.querySelector(".news-card-edited");
    expect(edited).toBeTruthy();
  });

  it("renders pinned badge for pinned articles", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [{ ...sampleArticle, is_pinned: true }] }));
    render(<NewsClient />);
    expect(screen.getByText("pinned")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    render(<NewsClient />);
    expect(screen.getByText("published")).toBeInTheDocument();
  });

  it("renders tags when present", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [{ ...sampleArticle, tags: ["Update", "Hot"] }] }));
    render(<NewsClient />);
    expect(screen.getByText("Update")).toBeInTheDocument();
    expect(screen.getByText("Hot")).toBeInTheDocument();
  });

  it("does not render tags section when tags array is empty", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    const { container } = render(<NewsClient />);
    expect(container.querySelector(".news-card-tags")).not.toBeTruthy();
  });

  // ── Article expand/collapse ──

  it("renders content preview when article is not expanded", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    render(<NewsClient />);
    expect(screen.getByText("readMore")).toBeInTheDocument();
  });

  it("renders full content when article is expanded", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], expandedArticleId: "a1" }));
    render(<NewsClient />);
    expect(screen.getByText("showLess")).toBeInTheDocument();
  });

  it("calls setExpandedArticleId when banner is clicked", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    render(<NewsClient />);
    const banner = screen.getByText("Test Article").closest("[role='button']");
    fireEvent.click(banner!);
    expect(setExpandedArticleId).toHaveBeenCalledWith("a1");
  });

  it("calls setExpandedArticleId('') when show less is clicked", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(
      baseNewsState({ articles: [sampleArticle], expandedArticleId: "a1", setExpandedArticleId }),
    );
    render(<NewsClient />);
    fireEvent.click(screen.getByText("showLess"));
    expect(setExpandedArticleId).toHaveBeenCalledWith("");
  });

  // ── Keyboard events on banner / preview ──

  it("toggles expansion on Enter keydown on banner", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    const { container } = render(<NewsClient />);
    const banner = container.querySelector(".news-card-banner")!;
    fireEvent.keyDown(banner, { key: "Enter" });
    expect(setExpandedArticleId).toHaveBeenCalledWith("a1");
  });

  it("toggles expansion on Space keydown on banner", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    const { container } = render(<NewsClient />);
    const banner = container.querySelector(".news-card-banner")!;
    fireEvent.keyDown(banner, { key: " " });
    expect(setExpandedArticleId).toHaveBeenCalledWith("a1");
  });

  it("collapses expanded article on Enter keydown on banner", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(
      baseNewsState({ articles: [sampleArticle], expandedArticleId: "a1", setExpandedArticleId }),
    );
    const { container } = render(<NewsClient />);
    const banner = container.querySelector(".news-card-banner")!;
    fireEvent.keyDown(banner, { key: "Enter" });
    expect(setExpandedArticleId).toHaveBeenCalledWith("");
  });

  it("does not toggle expansion on non-Enter/Space key on banner", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    const { container } = render(<NewsClient />);
    const banner = container.querySelector(".news-card-banner")!;
    fireEvent.keyDown(banner, { key: "Tab" });
    expect(setExpandedArticleId).not.toHaveBeenCalled();
  });

  it("expands article on Enter keydown on preview", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    const { container } = render(<NewsClient />);
    const preview = container.querySelector(".news-card-preview")!;
    fireEvent.keyDown(preview, { key: "Enter" });
    expect(setExpandedArticleId).toHaveBeenCalledWith("a1");
  });

  it("expands article on Space keydown on preview", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    const { container } = render(<NewsClient />);
    const preview = container.querySelector(".news-card-preview")!;
    fireEvent.keyDown(preview, { key: " " });
    expect(setExpandedArticleId).toHaveBeenCalledWith("a1");
  });

  it("does not expand on non-Enter/Space key on preview", () => {
    const setExpandedArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle], setExpandedArticleId }));
    const { container } = render(<NewsClient />);
    const preview = container.querySelector(".news-card-preview")!;
    fireEvent.keyDown(preview, { key: "Tab" });
    expect(setExpandedArticleId).not.toHaveBeenCalled();
  });

  // ── Forum link ──

  it("renders forum thread link when forum_post_id is set", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [{ ...sampleArticle, forum_post_id: "fp1" }] }));
    render(<NewsClient />);
    expect(screen.getByText("goToThread")).toBeInTheDocument();
  });

  it("does not render forum thread link when forum_post_id is null", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    render(<NewsClient />);
    expect(screen.queryByText("goToThread")).not.toBeInTheDocument();
  });

  // ── Manager actions ──

  it("shows edit/delete buttons when canManage is true", () => {
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, articles: [sampleArticle] }));
    render(<NewsClient />);
    const editBtns = screen.getAllByTitle("editPost");
    const deleteBtns = screen.getAllByTitle("deletePost");
    expect(editBtns.length).toBeGreaterThan(0);
    expect(deleteBtns.length).toBeGreaterThan(0);
  });

  it("does not show edit/delete buttons when canManage is false", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    render(<NewsClient />);
    expect(screen.queryByTitle("editPost")).not.toBeInTheDocument();
    expect(screen.queryByTitle("deletePost")).not.toBeInTheDocument();
  });

  it("calls handleEditArticle when edit button is clicked", () => {
    const handleEditArticle = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, articles: [sampleArticle], handleEditArticle }));
    render(<NewsClient />);
    fireEvent.click(screen.getByTitle("editPost"));
    expect(handleEditArticle).toHaveBeenCalledWith(sampleArticle);
  });

  it("calls setDeletingArticleId when delete button is clicked", () => {
    const setDeletingArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, articles: [sampleArticle], setDeletingArticleId }));
    render(<NewsClient />);
    fireEvent.click(screen.getByTitle("deletePost"));
    expect(setDeletingArticleId).toHaveBeenCalledWith("a1");
  });

  it("shows pinned star icon for pinned articles when canManage", () => {
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, articles: [{ ...sampleArticle, is_pinned: true }] }));
    render(<NewsClient />);
    expect(screen.getByTestId("game-icon-star")).toBeInTheDocument();
  });

  // ── Delete modal ──

  it("shows delete confirmation modal when deletingArticleId is set", () => {
    mockUseNews.mockReturnValue(baseNewsState({ deletingArticleId: "a1" }));
    render(<NewsClient />);
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
  });

  it("does not show delete modal when deletingArticleId is empty", () => {
    render(<NewsClient />);
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("calls handleConfirmDeleteArticle when modal confirm is clicked", () => {
    const handleConfirmDeleteArticle = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ deletingArticleId: "a1", handleConfirmDeleteArticle }));
    render(<NewsClient />);
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(handleConfirmDeleteArticle).toHaveBeenCalled();
  });

  it("calls setDeletingArticleId('') when modal cancel is clicked", () => {
    const setDeletingArticleId = vi.fn();
    mockUseNews.mockReturnValue(baseNewsState({ deletingArticleId: "a1", setDeletingArticleId }));
    render(<NewsClient />);
    fireEvent.click(screen.getByTestId("cancel-btn"));
    expect(setDeletingArticleId).toHaveBeenCalledWith("");
  });

  // ── Form rendering ──

  it("renders news form when isFormOpen and not editing (create mode)", () => {
    mockUseNews.mockReturnValue(baseNewsState({ canManage: true, isFormOpen: true, editingId: null }));
    render(<NewsClient />);
    expect(screen.getByTestId("news-form")).toBeInTheDocument();
  });

  it("renders news form inline when editing an article", () => {
    mockUseNews.mockReturnValue(
      baseNewsState({ canManage: true, isFormOpen: true, editingId: "a1", articles: [sampleArticle] }),
    );
    render(<NewsClient />);
    expect(screen.getByTestId("news-form")).toBeInTheDocument();
  });

  it("does not render form when canManage is false", () => {
    mockUseNews.mockReturnValue(baseNewsState({ isFormOpen: true }));
    render(<NewsClient />);
    expect(screen.queryByTestId("news-form")).not.toBeInTheDocument();
  });

  // ── Banner rendering ──

  it("renders article banner image", () => {
    const articleWithBanner = { ...sampleArticle, banner_url: "/custom-banner.png" };
    mockUseNews.mockReturnValue(baseNewsState({ articles: [articleWithBanner] }));
    const { container } = render(<NewsClient />);
    const bannerImg = container.querySelector('img[src="/custom-banner.png"]');
    expect(bannerImg).toBeTruthy();
  });

  it("renders default banner when banner_url is null", () => {
    mockUseNews.mockReturnValue(baseNewsState({ articles: [sampleArticle] }));
    const { container } = render(<NewsClient />);
    const bannerImg = container.querySelector('img[src="/assets/banners/banner_gold_dragon.png"]');
    expect(bannerImg).toBeTruthy();
  });

  // ── Pagination ──

  it("renders pagination bar", () => {
    render(<NewsClient />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });
});
