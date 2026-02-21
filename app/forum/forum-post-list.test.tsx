// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_loader: any, opts?: any) => {
    opts?.loading?.();
    const React = require("react");
    return ({ content, preview }: any) =>
      React.createElement("div", { "data-testid": "markdown", "data-preview": preview ? "true" : "false" }, content);
  },
}));
vi.mock("./forum-thumbnail", () => ({
  extractThumbnail: (content: string | null) => (content && content.includes("thumb") ? "thumb.png" : null),
}));
vi.mock("./forum-icons", () => ({
  UpArrow: () => {
    const React = require("react");
    return React.createElement("span", null, "▲");
  },
  DownArrow: () => {
    const React = require("react");
    return React.createElement("span", null, "▼");
  },
  CommentIcon: () => {
    const React = require("react");
    return React.createElement("span", null, "💬");
  },
  PostThumbnailBox: ({ thumbnail }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "thumbnail-box", "data-thumb": thumbnail || "" });
  },
}));
vi.mock("./forum-utils", () => ({
  formatTimeAgo: () => "2h ago",
}));
vi.mock("../components/pagination-bar", () => ({
  __esModule: true,
  default: ({ pagination }: any) => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "pagination", "data-page": pagination.page });
  },
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", props, children);
  },
}));

import ForumPostList from "./forum-post-list";
import type { ForumPost, SortMode } from "./forum-types";
import type { ForumCategory } from "@/lib/types/domain";

const t = vi.fn((key: string) => key);

const categories: ForumCategory[] = [
  { id: "cat1", name: "General", slug: "general", clan_id: "c1" },
  { id: "cat2", name: "Help", slug: "help", clan_id: "c1" },
] as ForumCategory[];

const samplePost: ForumPost = {
  id: "p1",
  title: "Hello World",
  content: "Post body",
  author_id: "u1",
  authorName: "Author",
  created_at: "2025-01-01T00:00:00Z",
  category_id: "cat1",
  categoryName: "General",
  score: 3,
  userVote: 0,
  comment_count: 1,
  is_pinned: false,
  is_locked: false,
  source_type: null,
} as ForumPost;

const basePagination = { page: 1, setPage: vi.fn(), totalItems: 0, pageSize: 20, totalPages: 0 };

function makeBaseProps(overrides: any = {}) {
  return {
    posts: [] as ForumPost[],
    categories,
    selectedCategory: "",
    sortMode: "hot" as SortMode,
    searchTerm: "",
    pagination: basePagination,
    isLoading: false,
    t,
    onSortChange: vi.fn(),
    onSearchChange: vi.fn(),
    onCategoryClick: vi.fn(),
    onPostClick: vi.fn(),
    onVotePost: vi.fn(),
    onNewPost: vi.fn(),
    onAllCategories: vi.fn(),
    ...overrides,
  };
}

describe("ForumPostList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading / Empty states ──

  it("renders loading state", () => {
    render(<ForumPostList {...makeBaseProps({ isLoading: true })} />);
    expect(screen.getByText("loadingPosts")).toBeInTheDocument();
  });

  it("renders empty state when no posts and no search", () => {
    render(<ForumPostList {...makeBaseProps()} />);
    expect(screen.getByText("noPosts")).toBeInTheDocument();
  });

  it("renders 'no results' when search has no matches", () => {
    render(<ForumPostList {...makeBaseProps({ searchTerm: "xyz" })} />);
    expect(screen.getByText("noResults")).toBeInTheDocument();
  });

  it("does not render empty state when loading", () => {
    render(<ForumPostList {...makeBaseProps({ isLoading: true })} />);
    expect(screen.queryByText("noPosts")).not.toBeInTheDocument();
  });

  // ── Toolbar ──

  it("renders new post button", () => {
    render(<ForumPostList {...makeBaseProps()} />);
    expect(screen.getByText("newPost")).toBeInTheDocument();
  });

  it("calls onNewPost when new post button is clicked", () => {
    const onNewPost = vi.fn();
    render(<ForumPostList {...makeBaseProps({ onNewPost })} />);
    fireEvent.click(screen.getByText("newPost"));
    expect(onNewPost).toHaveBeenCalled();
  });

  it("renders sort buttons", () => {
    render(<ForumPostList {...makeBaseProps()} />);
    expect(screen.getByText("sortHot")).toBeInTheDocument();
    expect(screen.getByText("sortNew")).toBeInTheDocument();
    expect(screen.getByText("sortTop")).toBeInTheDocument();
  });

  it("calls onSortChange with correct mode when sort button clicked", () => {
    const onSortChange = vi.fn();
    render(<ForumPostList {...makeBaseProps({ onSortChange })} />);
    fireEvent.click(screen.getByText("sortNew"));
    expect(onSortChange).toHaveBeenCalledWith("new");
    fireEvent.click(screen.getByText("sortTop"));
    expect(onSortChange).toHaveBeenCalledWith("top");
    fireEvent.click(screen.getByText("sortHot"));
    expect(onSortChange).toHaveBeenCalledWith("hot");
  });

  it("marks active sort button with active class", () => {
    const { container } = render(<ForumPostList {...makeBaseProps({ sortMode: "new" })} />);
    const sortBtns = container.querySelectorAll(".forum-sort-btn");
    const newBtn = Array.from(sortBtns).find((b) => b.textContent === "sortNew");
    expect(newBtn?.classList.contains("active")).toBe(true);
  });

  it("renders search input with correct placeholder", () => {
    render(<ForumPostList {...makeBaseProps()} />);
    expect(screen.getByPlaceholderText("search")).toBeInTheDocument();
  });

  it("calls onSearchChange when search input changes", () => {
    const onSearchChange = vi.fn();
    render(<ForumPostList {...makeBaseProps({ onSearchChange })} />);
    fireEvent.change(screen.getByPlaceholderText("search"), { target: { value: "test query" } });
    expect(onSearchChange).toHaveBeenCalledWith("test query");
  });

  it("renders search input with current search value", () => {
    render(<ForumPostList {...makeBaseProps({ searchTerm: "hello" })} />);
    expect(screen.getByPlaceholderText("search")).toHaveValue("hello");
  });

  // ── Category pills ──

  it("renders all category pills plus 'all' pill", () => {
    render(<ForumPostList {...makeBaseProps()} />);
    expect(screen.getByText("allCategories")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("calls onAllCategories when 'all' pill is clicked", () => {
    const onAllCategories = vi.fn();
    render(<ForumPostList {...makeBaseProps({ onAllCategories })} />);
    fireEvent.click(screen.getByText("allCategories"));
    expect(onAllCategories).toHaveBeenCalled();
  });

  it("calls onCategoryClick with slug when category pill is clicked", () => {
    const onCategoryClick = vi.fn();
    render(<ForumPostList {...makeBaseProps({ onCategoryClick })} />);
    fireEvent.click(screen.getByText("Help"));
    expect(onCategoryClick).toHaveBeenCalledWith("help");
  });

  it("marks 'all' pill as active when no category is selected", () => {
    const { container } = render(<ForumPostList {...makeBaseProps()} />);
    const pills = container.querySelectorAll(".forum-cat-pill");
    expect(pills[0]!.classList.contains("active")).toBe(true);
  });

  it("marks selected category pill as active", () => {
    const { container } = render(<ForumPostList {...makeBaseProps({ selectedCategory: "cat2" })} />);
    const pills = container.querySelectorAll(".forum-cat-pill");
    const helpPill = Array.from(pills).find((p) => p.textContent === "Help");
    expect(helpPill?.classList.contains("active")).toBe(true);
    expect(pills[0]!.classList.contains("active")).toBe(false);
  });

  // ── Post cards ──

  it("renders posts with titles", () => {
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost] })} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders post content preview", () => {
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost] })} />);
    expect(screen.getByText("Post body")).toBeInTheDocument();
  });

  it("does not render content preview when content is empty", () => {
    const noContentPost = { ...samplePost, content: "" };
    render(<ForumPostList {...makeBaseProps({ posts: [noContentPost] })} />);
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  it("renders post meta with author and category", () => {
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost] })} />);
    expect(screen.getByText("Author", { exact: false })).toBeInTheDocument();
  });

  it("renders vote score and comment count", () => {
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost] })} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });

  it("calls onPostClick when a post card is clicked", () => {
    const onPostClick = vi.fn();
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onPostClick })} />);
    fireEvent.click(screen.getByText("Hello World").closest("[role='button']")!);
    expect(onPostClick).toHaveBeenCalledWith(samplePost);
  });

  it("calls onPostClick on keyboard Enter", () => {
    const onPostClick = vi.fn();
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onPostClick })} />);
    const card = screen.getByText("Hello World").closest("[role='button']")!;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onPostClick).toHaveBeenCalledWith(samplePost);
  });

  it("calls onPostClick on keyboard Space", () => {
    const onPostClick = vi.fn();
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onPostClick })} />);
    const card = screen.getByText("Hello World").closest("[role='button']")!;
    fireEvent.keyDown(card, { key: " " });
    expect(onPostClick).toHaveBeenCalledWith(samplePost);
  });

  // ── Voting on posts ──

  it("calls onVotePost with upvote when up arrow is clicked", () => {
    const onVotePost = vi.fn();
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onVotePost })} />);
    fireEvent.click(screen.getAllByLabelText("upvote")[0]!);
    expect(onVotePost).toHaveBeenCalledWith("p1", 1);
  });

  it("calls onVotePost with downvote when down arrow is clicked", () => {
    const onVotePost = vi.fn();
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onVotePost })} />);
    fireEvent.click(screen.getAllByLabelText("downvote")[0]!);
    expect(onVotePost).toHaveBeenCalledWith("p1", -1);
  });

  it("vote click does not propagate to post card click", () => {
    const onPostClick = vi.fn();
    const onVotePost = vi.fn();
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onPostClick, onVotePost })} />);
    fireEvent.click(screen.getAllByLabelText("upvote")[0]!);
    expect(onVotePost).toHaveBeenCalled();
    expect(onPostClick).not.toHaveBeenCalled();
  });

  it("click on vote column div stops propagation", () => {
    const onPostClick = vi.fn();
    const { container } = render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onPostClick })} />);
    const voteCol = container.querySelector(".forum-vote-col")!;
    fireEvent.click(voteCol);
    expect(onPostClick).not.toHaveBeenCalled();
  });

  it("keyDown on vote column div stops propagation", () => {
    const onPostClick = vi.fn();
    const { container } = render(<ForumPostList {...makeBaseProps({ posts: [samplePost], onPostClick })} />);
    const voteCol = container.querySelector(".forum-vote-col")!;
    fireEvent.keyDown(voteCol, { key: "Enter" });
    expect(onPostClick).not.toHaveBeenCalled();
  });

  it("applies upvoted class for userVote 1", () => {
    const upvotedPost = { ...samplePost, userVote: 1 };
    const { container } = render(<ForumPostList {...makeBaseProps({ posts: [upvotedPost] })} />);
    expect(container.querySelector(".forum-vote-btn.upvoted")).toBeTruthy();
  });

  it("applies downvoted class for userVote -1", () => {
    const downvotedPost = { ...samplePost, userVote: -1 };
    const { container } = render(<ForumPostList {...makeBaseProps({ posts: [downvotedPost] })} />);
    expect(container.querySelector(".forum-vote-btn.downvoted")).toBeTruthy();
  });

  // ── Badges ──

  it("renders pinned badge for pinned posts", () => {
    const pinnedPost = { ...samplePost, is_pinned: true };
    render(<ForumPostList {...makeBaseProps({ posts: [pinnedPost] })} />);
    expect(screen.getByText("pinned")).toBeInTheDocument();
  });

  it("renders locked badge for locked posts", () => {
    const lockedPost = { ...samplePost, is_locked: true };
    render(<ForumPostList {...makeBaseProps({ posts: [lockedPost] })} />);
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("renders event source badge and click stops propagation", () => {
    const onPostClick = vi.fn();
    const eventPost = { ...samplePost, source_type: "event" };
    render(<ForumPostList {...makeBaseProps({ posts: [eventPost], onPostClick })} />);
    const badge = screen.getByText("sourceEvent");
    expect(badge).toBeInTheDocument();
    fireEvent.click(badge);
    expect(onPostClick).not.toHaveBeenCalled();
  });

  it("renders announcement source badge and click stops propagation", () => {
    const onPostClick = vi.fn();
    const announcementPost = { ...samplePost, source_type: "announcement" };
    render(<ForumPostList {...makeBaseProps({ posts: [announcementPost], onPostClick })} />);
    const badge = screen.getByText("sourceAnnouncement");
    expect(badge).toBeInTheDocument();
    fireEvent.click(badge);
    expect(onPostClick).not.toHaveBeenCalled();
  });

  it("does not render category badge when categoryName is null", () => {
    const noCatPost = { ...samplePost, categoryName: null };
    const { container } = render(<ForumPostList {...makeBaseProps({ posts: [noCatPost] })} />);
    expect(container.querySelector(".forum-cat-badge")).not.toBeTruthy();
  });

  // ── Pagination ──

  it("does not render pagination when totalItems <= pageSize", () => {
    render(<ForumPostList {...makeBaseProps({ pagination: { ...basePagination, totalItems: 5, pageSize: 20 } })} />);
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("renders pagination when totalItems > pageSize", () => {
    render(
      <ForumPostList
        {...makeBaseProps({ pagination: { ...basePagination, totalItems: 25, pageSize: 20, totalPages: 2 } })}
      />,
    );
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  // ── Thumbnail ──

  it("renders thumbnail box for each post", () => {
    render(<ForumPostList {...makeBaseProps({ posts: [samplePost] })} />);
    expect(screen.getByTestId("thumbnail-box")).toBeInTheDocument();
  });

  // ── Multiple posts ──

  it("renders multiple posts", () => {
    const posts = [
      samplePost,
      { ...samplePost, id: "p2", title: "Second Post" },
      { ...samplePost, id: "p3", title: "Third Post" },
    ];
    render(<ForumPostList {...makeBaseProps({ posts })} />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByText("Second Post")).toBeInTheDocument();
    expect(screen.getByText("Third Post")).toBeInTheDocument();
  });
});
