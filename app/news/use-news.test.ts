// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";

let mockSupabase: ReturnType<typeof createMockSupabase>;
const mockPushToast = vi.fn();

const stableT = vi.fn((key: string) => key);
const stableSearchParams = new URLSearchParams();

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => stableT),
  useLocale: vi.fn(() => "de"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => stableSearchParams,
  usePathname: () => "/",
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

vi.mock("@/lib/hooks/use-banner-upload", () => ({
  useBannerUpload: vi.fn(() => ({
    handleBannerUpload: vi.fn(),
    isBannerUploading: false,
  })),
}));

vi.mock("@/lib/forum-thread-sync", () => ({
  createLinkedForumPost: vi.fn().mockResolvedValue({ forumPostId: null, error: null }),
}));

vi.mock("@/lib/api/validation", () => ({
  escapeLikePattern: vi.fn((s: string) => s),
}));

import { useNews } from "./use-news";

const MOCK_ARTICLE = {
  id: "art-1",
  title: "Test Article",
  content: "Article content here",
  type: "announcement",
  is_pinned: false,
  status: "published",
  tags: ["news", "update"],
  created_at: "2026-01-15T10:00:00Z",
  updated_at: null,
  created_by: "user-1",
  banner_url: null,
  updated_by: null,
  forum_post_id: null,
  author: { display_name: "TestUser", username: "testuser" },
  editor: null,
};

describe("useNews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    const _articlesChain = createChainableMock({ data: [MOCK_ARTICLE], error: null, count: 1 });
    const _tagsChain = createChainableMock({ data: [{ tags: ["news", "update"] }], error: null });

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "articles") {
        const chain = createChainableMock({ data: [MOCK_ARTICLE], error: null, count: 1 });
        return chain;
      }
      return createChainableMock();
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
  });

  it("starts in loading state", () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.articles).toEqual([]);
  });

  it("loads articles on mount", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.articles).toHaveLength(1);
    expect(result.current.articles[0]!.title).toBe("Test Article");
    expect(result.current.canManage).toBe(true);
    expect(result.current.currentUserId).toBe("test-user");
  });

  it("has no active filters initially", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.tagFilter).toBe("all");
    expect(result.current.searchTerm).toBe("");
  });

  it("opens and closes create form", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleOpenCreate();
    });

    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingId).toBe("");

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.isFormOpen).toBe(false);
  });

  it("populates form when editing an article", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const article = result.current.articles[0]!;
    act(() => {
      result.current.handleEditArticle(article);
    });

    expect(result.current.isFormOpen).toBe(true);
    expect(result.current.editingId).toBe("art-1");
    expect(result.current.formValues.title).toBe("Test Article");
    expect(result.current.formValues.content).toBe("Article content here");
  });

  it("handles field changes via handleFieldChange", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleFieldChange("title", "New Title");
    });

    expect(result.current.formValues.title).toBe("New Title");

    act(() => {
      result.current.handleFieldChange("isPinned", true);
    });

    expect(result.current.formValues.isPinned).toBe(true);
  });

  it("clears filters", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.handleSearchTermChange("test");
      result.current.handleTagFilterChange("news");
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.handleClearFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.searchTerm).toBe("");
    expect(result.current.tagFilter).toBe("all");
  });

  it("deletes an article", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const deleteChain = createChainableMock({
      data: [{ id: "art-1" }],
      error: null,
    });
    mockSupabase.mockFrom.mockReturnValue(deleteChain);

    act(() => {
      result.current.setDeletingArticleId("art-1");
    });

    expect(result.current.deletingArticleId).toBe("art-1");

    await act(async () => {
      await result.current.handleConfirmDeleteArticle();
    });

    expect(mockPushToast).toHaveBeenCalledWith("postDeleted");
  });

  it("shows error on article load failure", async () => {
    mockSupabase.mockFrom.mockImplementation(() => {
      return createChainableMock({
        data: null,
        error: { message: "DB error", code: "500", details: "", hint: "" },
        count: undefined,
      });
    });

    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPushToast).toHaveBeenCalled();
  });

  it("handles submit for new article", async () => {
    const t = vi.fn((key: string) => key);
    const { result } = renderHook(() => useNews(t));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockSupabase.mockFrom.mockImplementation((table: string) => {
      if (table === "articles") {
        const chain = createChainableMock({ data: [MOCK_ARTICLE], error: null, count: 1 });
        chain.single.mockResolvedValue({ data: { id: "new-art-1" }, error: null });
        chain.maybeSingle.mockResolvedValue({ data: { id: "new-art-1" }, error: null });
        return chain;
      }
      return createChainableMock();
    });

    act(() => {
      result.current.handleFieldChange("title", "New Article Title");
      result.current.handleFieldChange("content", "New article content body");
    });

    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });

    expect(mockPushToast).toHaveBeenCalledWith("postCreated");
  });
});
