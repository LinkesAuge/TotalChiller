import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLinkedForumPost } from "./forum-thread-sync";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ── Supabase mock builder ── */

interface MockChain {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

function createMockSupabase(overrides?: {
  categoryData?: { id: string } | null;
  insertData?: { id: string } | null;
  insertError?: { message: string } | null;
}): { supabase: SupabaseClient; chain: MockChain } {
  const defaults = {
    categoryData: { id: "cat-123" },
    insertData: { id: "post-456" },
    insertError: null,
    ...overrides,
  };

  const chain: MockChain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  /* maybeSingle resolves with category lookup result */
  chain.maybeSingle.mockResolvedValue({ data: defaults.categoryData, error: null });

  /* single resolves with insert result */
  chain.single.mockResolvedValue({ data: defaults.insertData, error: defaults.insertError });

  /* Chain wiring: each method returns the chain object so methods can be chained */
  chain.select.mockReturnValue({ eq: chain.eq, single: chain.single });
  chain.eq.mockReturnValue({ eq: chain.eq, maybeSingle: chain.maybeSingle, single: chain.single });
  chain.insert.mockReturnValue({ select: chain.select });
  chain.from.mockReturnValue({
    select: chain.select,
    insert: chain.insert,
    eq: chain.eq,
  });

  const supabase = { from: chain.from } as unknown as SupabaseClient;
  return { supabase, chain };
}

/* ── Shared test params ── */

const baseParams = {
  clanId: "clan-1",
  authorId: "user-1",
  title: "Test Event",
  content: "Some description",
  sourceType: "event" as const,
  sourceId: "evt-99",
  categorySlug: "events",
};

/* ── Tests ── */

describe("createLinkedForumPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns forumPostId on success", async () => {
    const { supabase } = createMockSupabase();
    const result = await createLinkedForumPost(supabase, baseParams);
    expect(result.forumPostId).toBe("post-456");
    expect(result.error).toBeNull();
  });

  it("calls supabase.from('forum_categories') to look up category", async () => {
    const { supabase, chain } = createMockSupabase();
    await createLinkedForumPost(supabase, baseParams);
    expect(chain.from).toHaveBeenCalledWith("forum_categories");
  });

  it("calls supabase.from('forum_posts') to insert the post", async () => {
    const { supabase, chain } = createMockSupabase();
    await createLinkedForumPost(supabase, baseParams);
    expect(chain.from).toHaveBeenCalledWith("forum_posts");
  });

  it("passes correct insert payload including source_type and source_id", async () => {
    const { supabase, chain } = createMockSupabase();
    await createLinkedForumPost(supabase, baseParams);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        clan_id: "clan-1",
        author_id: "user-1",
        title: "Test Event",
        content: "Some description",
        source_type: "event",
        source_id: "evt-99",
        category_id: "cat-123",
      }),
    );
  });

  it("returns error message when insert fails", async () => {
    const { supabase } = createMockSupabase({
      insertData: null,
      insertError: { message: "RLS violation" },
    });
    const result = await createLinkedForumPost(supabase, baseParams);
    expect(result.forumPostId).toBeNull();
    expect(result.error).toBe("RLS violation");
  });

  it("uses null category_id when category is not found", async () => {
    const { supabase, chain } = createMockSupabase({ categoryData: null });
    await createLinkedForumPost(supabase, baseParams);
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ category_id: null }));
  });

  it("handles empty content by passing null", async () => {
    const { supabase, chain } = createMockSupabase();
    await createLinkedForumPost(supabase, { ...baseParams, content: "" });
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ content: null }));
  });

  it("works with 'announcement' sourceType", async () => {
    const { supabase, chain } = createMockSupabase();
    await createLinkedForumPost(supabase, {
      ...baseParams,
      sourceType: "announcement",
      categorySlug: "announcements",
    });
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ source_type: "announcement" }));
  });
});
