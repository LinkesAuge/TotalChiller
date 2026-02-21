// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

let mockSupabase: ReturnType<typeof createMockSupabase>;
const mockPushToast = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

const stableT = vi.fn((key: string) => key);
const stableSearchParams = new URLSearchParams();

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: vi.fn() }),
  useSearchParams: () => stableSearchParams,
  usePathname: () => "/forum",
}));

vi.mock("@/app/hooks/use-supabase", () => ({
  useSupabase: vi.fn(() => mockSupabase.supabase),
}));

const stableAuth = { userId: "test-user", isAuthenticated: true, isLoading: false };
vi.mock("@/app/hooks/use-auth", () => ({
  useAuth: vi.fn(() => stableAuth),
}));

vi.mock("@/app/components/toast-provider", () => ({
  useToast: vi.fn(() => ({ pushToast: mockPushToast })),
}));

const stableClanContext = { clanId: "clan-1", clanName: "TestClan" };
vi.mock("@/app/hooks/use-clan-context", () => ({
  __esModule: true,
  default: vi.fn(() => stableClanContext),
}));

const stableUserRole = { isContentManager: true, isAnyAdmin: false };
vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: vi.fn(() => stableUserRole),
}));

vi.mock("@/lib/api/validation", () => ({
  escapeLikePattern: vi.fn((s: string) => s),
}));

vi.mock("./forum-utils", () => ({
  computeHotRank: vi.fn(() => 0),
  resolveAuthorNames: vi.fn().mockResolvedValue({ "user-1": "TestUser" }),
}));

import { useForum } from "./use-forum";
import type { ForumPost, ForumComment, ForumCategory } from "./forum-types";

const MOCK_CATEGORY: ForumCategory = {
  id: "cat-1",
  clan_id: "clan-1",
  name: "General",
  slug: "general",
  description: "General discussion",
  sort_order: 0,
};

const MOCK_CATEGORY_2: ForumCategory = {
  id: "cat-2",
  clan_id: "clan-1",
  name: "Announcements",
  slug: "announcements",
  description: "Announcements",
  sort_order: 1,
};

const MOCK_POST: ForumPost = {
  id: "post-1",
  category_id: "cat-1",
  author_id: "user-1",
  title: "Test Post",
  content: "Post content",
  is_pinned: false,
  is_locked: false,
  score: 5,
  comment_count: 2,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  source_type: null,
  source_id: null,
  authorName: "TestUser",
  categoryName: "General",
  categorySlug: "general",
  userVote: 0,
};

const MOCK_COMMENT = {
  id: "comment-1",
  post_id: "post-1",
  author_id: "user-1",
  content: "A comment",
  parent_comment_id: null,
  score: 1,
  created_at: "2026-01-15T11:00:00Z",
  updated_at: "2026-01-15T11:00:00Z",
};

describe("useForum", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "forum_categories") {
        return createChainableMock({
          data: [MOCK_CATEGORY],
          error: null,
        });
      }
      if (table === "forum_posts") {
        return createChainableMock({
          data: [MOCK_POST],
          error: null,
          count: 1,
        });
      }
      if (table === "forum_votes") {
        return createChainableMock({ data: [], error: null });
      }
      if (table === "forum_comments") {
        return createChainableMock({ data: [], error: null });
      }
      if (table === "forum_comment_votes") {
        return createChainableMock({ data: [], error: null });
      }
      if (table === "profiles") {
        return createChainableMock({
          data: { display_name: "TestUser", username: "testuser" },
          error: null,
        });
      }
      return createChainableMock();
    });
  });

  it("starts in loading state", () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.viewMode).toBe("list");
  });

  it("loads categories and posts on mount", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    expect(result.current.categories[0]!.name).toBe("General");
    expect(result.current.canManage).toBe(true);
    expect(result.current.currentUserId).toBe("test-user");
  });

  it("has default form state", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    expect(result.current.formTitle).toBe("");
    expect(result.current.formContent).toBe("");
    expect(result.current.editingPostId).toBe("");
    expect(result.current.formPinned).toBe(false);
  });

  it("opens create form", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleOpenCreate();
    });

    expect(result.current.viewMode).toBe("create");
    expect(result.current.formTitle).toBe("");
  });

  it("populates form when editing a post", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleEditPost(MOCK_POST);
    });

    expect(result.current.viewMode).toBe("create");
    expect(result.current.formTitle).toBe("Test Post");
    expect(result.current.formContent).toBe("Post content");
    expect(result.current.editingPostId).toBe("post-1");
  });

  it("resets form", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleEditPost(MOCK_POST);
    });

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formTitle).toBe("");
    expect(result.current.formContent).toBe("");
    expect(result.current.editingPostId).toBe("");
  });

  it("submits a new post", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    const insertChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") return insertChain;
      if (table === "forum_categories") {
        return createChainableMock({ data: [MOCK_CATEGORY], error: null });
      }
      if (table === "forum_votes") {
        return createChainableMock({ data: [], error: null });
      }
      return createChainableMock();
    });

    act(() => {
      result.current.setFormTitle("New Post Title");
      result.current.setFormContent("New post content");
    });

    await act(async () => {
      await result.current.handleSubmitPost();
    });

    expect(insertChain.insert).toHaveBeenCalled();
  });

  it("handles post deletion", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    const deleteChain = createChainableMock({
      data: [{ id: "post-1" }],
      error: null,
    });
    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") return deleteChain;
      if (table === "forum_categories") {
        return createChainableMock({ data: [MOCK_CATEGORY], error: null });
      }
      if (table === "forum_votes") {
        return createChainableMock({ data: [], error: null });
      }
      return createChainableMock();
    });

    act(() => {
      result.current.setDeletingPostId("post-1");
    });

    expect(result.current.deletingPostId).toBe("post-1");

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(result.current.deletingPostId).toBe("");
  });

  it("handles delete failure gracefully", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    const deleteChain = createChainableMock({
      data: [],
      error: { message: "delete failed", code: "500", details: "", hint: "" },
    });
    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") return deleteChain;
      if (table === "forum_categories") {
        return createChainableMock({ data: [MOCK_CATEGORY], error: null });
      }
      if (table === "forum_votes") {
        return createChainableMock({ data: [], error: null });
      }
      return createChainableMock();
    });

    act(() => {
      result.current.setDeletingPostId("post-1");
    });

    await act(async () => {
      await result.current.handleConfirmDelete();
    });

    expect(mockPushToast).toHaveBeenCalledWith("deleteFailed");
  });

  it("resets form and switches to list via resetFormAndSetList", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleOpenCreate();
      result.current.setFormTitle("Draft");
    });

    act(() => {
      result.current.resetFormAndSetList();
    });

    expect(result.current.viewMode).toBe("list");
    expect(result.current.formTitle).toBe("");
  });

  it("handles tables-not-ready gracefully", async () => {
    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "forum_categories") {
        return createChainableMock({
          data: null,
          error: { message: "schema cache", code: "PGRST204", details: "", hint: "" },
        });
      }
      return createChainableMock();
    });

    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.tablesReady).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
  });

  it("sets sort mode", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.setSortMode("top");
    });

    expect(result.current.sortMode).toBe("top");
  });

  it("sets search term", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.setSearchTerm("hello");
    });

    expect(result.current.searchTerm).toBe("hello");
  });

  it("handles open post (detail view)", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleOpenPost(MOCK_POST);
    });

    expect(result.current.viewMode).toBe("detail");
    expect(result.current.selectedPost?.id).toBe("post-1");
  });

  it("handles back to list", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleOpenPost(MOCK_POST);
    });

    expect(result.current.viewMode).toBe("detail");

    act(() => {
      result.current.handleBackToList();
    });

    expect(result.current.viewMode).toBe("list");
    expect(result.current.selectedPost).toBeNull();
  });

  it("sets comment text", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.setCommentText("My comment");
    });

    expect(result.current.commentText).toBe("My comment");
  });

  it("sets replying to", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.setReplyingTo("comment-1");
    });

    expect(result.current.replyingTo).toBe("comment-1");
  });

  it("sets form pinned", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.setFormPinned(true);
    });

    expect(result.current.formPinned).toBe(true);
  });

  it("sets preview mode", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.setIsPreviewMode(true);
    });

    expect(result.current.isPreviewMode).toBe(true);
  });

  it("has pagination", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    expect(result.current.pagination).toBeDefined();
    expect(result.current.pagination.page).toBeDefined();
  });

  it("exposes supabase client", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    expect(result.current.supabase).toBeDefined();
  });

  it("exposes refs", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    expect(result.current.detailRef).toBeDefined();
    expect(result.current.contentTextareaRef).toBeDefined();
  });

  it("handles submit post when editing", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    const updateChain = createChainableMock({ data: null, error: null });
    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "forum_posts") return updateChain;
      if (table === "forum_categories") {
        return createChainableMock({ data: [MOCK_CATEGORY], error: null });
      }
      if (table === "forum_votes") {
        return createChainableMock({ data: [], error: null });
      }
      return createChainableMock();
    });

    act(() => {
      result.current.handleEditPost(MOCK_POST);
      result.current.setFormTitle("Updated Title");
    });

    await act(async () => {
      await result.current.handleSubmitPost();
    });

    expect(updateChain.update).toHaveBeenCalled();
  });

  it("sets category when editing a post", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useForum(t));

    await waitFor(() => {
      expect(result.current.categories).toHaveLength(1);
    });

    act(() => {
      result.current.handleEditPost(MOCK_POST);
    });

    expect(result.current.formCategoryId).toBe("cat-1");
  });
});
