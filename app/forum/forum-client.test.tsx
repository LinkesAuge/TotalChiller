// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => vi.fn((key: string) => key)),
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
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any) => {
    const React = require("react");
    const Component = (_props: any) => React.createElement("div", { "data-testid": "dynamic-component" });
    Component.displayName = "DynamicComponent";
    return Component;
  },
}));

vi.mock("../components/auth-actions", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "auth-actions" });
  },
}));
vi.mock("../components/page-top-bar", () => ({
  __esModule: true,
  default: ({ title }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "page-top-bar" }, title);
  },
}));
vi.mock("../components/section-hero", () => ({
  __esModule: true,
  default: ({ title }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "section-hero" }, title);
  },
}));

const mockUseClanContext = vi.fn();
vi.mock("../hooks/use-clan-context", () => ({
  __esModule: true,
  default: () => mockUseClanContext(),
}));

const mockUseForum = vi.fn();
vi.mock("./use-forum", () => ({
  useForum: (...args: any[]) => mockUseForum(...args),
}));

vi.mock("./forum-post-list", () => ({
  __esModule: true,
  default: (_props: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "forum-post-list" });
  },
}));

import ForumClient from "./forum-client";

function baseForumState(overrides: Record<string, any> = {}) {
  return {
    categories: [],
    posts: [],
    comments: [],
    selectedCategory: "",
    sortMode: "hot",
    viewMode: "list",
    selectedPost: null,
    searchTerm: "",
    isLoading: false,
    tablesReady: true,
    pagination: { page: 1, setPage: vi.fn(), totalItems: 0, pageSize: 20, totalPages: 0 },
    formTitle: "",
    formContent: "",
    formCategoryId: "",
    formPinned: false,
    editingPostId: "",
    isPreviewMode: false,
    isImageUploading: false,
    setFormTitle: vi.fn(),
    setFormContent: vi.fn(),
    setFormCategoryId: vi.fn(),
    setFormPinned: vi.fn(),
    setIsPreviewMode: vi.fn(),
    setIsImageUploading: vi.fn(),
    commentText: "",
    replyingTo: "",
    setCommentText: vi.fn(),
    setReplyingTo: vi.fn(),
    deletingPostId: "",
    setDeletingPostId: vi.fn(),
    detailRef: { current: null },
    contentTextareaRef: { current: null },
    canManage: false,
    currentUserId: "u1",
    supabase: {},
    setSortMode: vi.fn(),
    setSearchTerm: vi.fn(),
    handleOpenPost: vi.fn(),
    handleVotePost: vi.fn(),
    handleVoteComment: vi.fn(),
    handleOpenCreate: vi.fn(),
    handleEditPost: vi.fn(),
    handleSubmitPost: vi.fn(),
    resetFormAndSetList: vi.fn(),
    handleConfirmDelete: vi.fn(),
    handleTogglePin: vi.fn(),
    handleToggleLock: vi.fn(),
    handleSubmitComment: vi.fn(),
    handleSubmitReply: vi.fn(),
    handleEditComment: vi.fn(),
    handleDeleteComment: vi.fn(),
    handleBackToList: vi.fn(),
    ...overrides,
  };
}

describe("ForumClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClanContext.mockReturnValue({ clanId: "clan1" });
    mockUseForum.mockReturnValue(baseForumState());
  });

  it("renders 'select clan' message when no clan context", () => {
    mockUseClanContext.mockReturnValue(null);
    render(<ForumClient />);
    expect(screen.getByText("selectClanToView")).toBeInTheDocument();
  });

  it("renders tables not ready message", () => {
    mockUseForum.mockReturnValue(baseForumState({ tablesReady: false }));
    render(<ForumClient />);
    expect(screen.getByText("emptyTitle")).toBeInTheDocument();
    expect(screen.getByText("tablesNotReadyHint")).toBeInTheDocument();
  });

  it("renders post list in list view mode", () => {
    render(<ForumClient />);
    expect(screen.getByTestId("forum-post-list")).toBeInTheDocument();
  });

  it("renders create view with back button", () => {
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "create" }));
    render(<ForumClient />);
    expect(screen.getByText(/backToForum/)).toBeInTheDocument();
    expect(screen.getByTestId("dynamic-component")).toBeInTheDocument();
  });

  it("renders detail view with back button when selectedPost is set", () => {
    mockUseForum.mockReturnValue(
      baseForumState({
        viewMode: "detail",
        selectedPost: { id: "p1", title: "Test Post" },
      }),
    );
    render(<ForumClient />);
    expect(screen.getByText(/backToForum/)).toBeInTheDocument();
  });

  it("renders page top bar and section hero", () => {
    render(<ForumClient />);
    expect(screen.getByTestId("page-top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("section-hero")).toBeInTheDocument();
  });

  it("calls resetFormAndSetList when back button clicked in create view", () => {
    const resetFn = vi.fn();
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "create", resetFormAndSetList: resetFn }));
    render(<ForumClient />);
    fireEvent.click(screen.getByText(/backToForum/));
    expect(resetFn).toHaveBeenCalled();
  });

  /* ── Detail view with handleBackToList ── */

  it("calls handleBackToList when back button clicked in detail view", () => {
    const handleBackToList = vi.fn();
    mockUseForum.mockReturnValue(
      baseForumState({
        viewMode: "detail",
        selectedPost: { id: "p1", title: "Test" },
        handleBackToList,
      }),
    );
    render(<ForumClient />);
    fireEvent.click(screen.getByText(/backToForum/));
    expect(handleBackToList).toHaveBeenCalled();
  });

  /* ── List view renders ForumPostList ── */

  it("renders ForumPostList with correct test id in list view", () => {
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "list" }));
    render(<ForumClient />);
    expect(screen.getByTestId("forum-post-list")).toBeInTheDocument();
  });

  /* ── Detail view does NOT render when selectedPost is null ── */

  it("falls through to list view when viewMode is detail but selectedPost is null", () => {
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "detail", selectedPost: null }));
    render(<ForumClient />);
    expect(screen.getByTestId("forum-post-list")).toBeInTheDocument();
    expect(screen.queryByText(/backToForum/)).not.toBeInTheDocument();
  });

  /* ── No clan: page-top-bar + section-hero rendered ── */

  it("renders page-top-bar and section-hero in no-clan state", () => {
    mockUseClanContext.mockReturnValue(null);
    render(<ForumClient />);
    expect(screen.getByTestId("page-top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("section-hero")).toBeInTheDocument();
  });

  /* ── Tables not ready: renders hint text ── */

  it("renders tablesNotReadyHint with secondary styling", () => {
    mockUseForum.mockReturnValue(baseForumState({ tablesReady: false }));
    render(<ForumClient />);
    const hint = screen.getByText("tablesNotReadyHint");
    expect(hint).toBeInTheDocument();
    expect(hint).toHaveClass("text-text-muted");
  });

  /* ── Create view renders dynamic ForumPostForm ── */

  it("renders dynamic component (ForumPostForm) in create view", () => {
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "create" }));
    render(<ForumClient />);
    expect(screen.getByTestId("dynamic-component")).toBeInTheDocument();
  });

  /* ── Detail view renders dynamic ForumPostDetail ── */

  it("renders dynamic component (ForumPostDetail) in detail view", () => {
    mockUseForum.mockReturnValue(
      baseForumState({
        viewMode: "detail",
        selectedPost: { id: "p2", title: "Detail" },
      }),
    );
    render(<ForumClient />);
    expect(screen.getByTestId("dynamic-component")).toBeInTheDocument();
  });

  /* ── All views show page-top-bar ── */

  it("renders page-top-bar in create view", () => {
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "create" }));
    render(<ForumClient />);
    expect(screen.getByTestId("page-top-bar")).toBeInTheDocument();
  });

  it("renders page-top-bar in detail view", () => {
    mockUseForum.mockReturnValue(baseForumState({ viewMode: "detail", selectedPost: { id: "p1", title: "X" } }));
    render(<ForumClient />);
    expect(screen.getByTestId("page-top-bar")).toBeInTheDocument();
  });

  /* ── Content-inner wrapper present ── */

  it("wraps content in content-inner div", () => {
    render(<ForumClient />);
    const contentInner = document.querySelector(".content-inner");
    expect(contentInner).toBeInTheDocument();
  });

  /* ── Forum empty class for no-clan and tables-not-ready ── */

  it("renders forum-empty class in no-clan state", () => {
    mockUseClanContext.mockReturnValue(null);
    render(<ForumClient />);
    expect(document.querySelector(".forum-empty")).toBeInTheDocument();
  });

  it("renders forum-empty class in tables-not-ready state", () => {
    mockUseForum.mockReturnValue(baseForumState({ tablesReady: false }));
    render(<ForumClient />);
    expect(document.querySelector(".forum-empty")).toBeInTheDocument();
  });
});
