import type { SupabaseClient } from "@supabase/supabase-js";

/* ── Types ── */

interface CreateLinkedPostParams {
  readonly clanId: string;
  readonly authorId: string;
  readonly title: string;
  readonly content: string;
  readonly sourceType: "event" | "announcement";
  readonly sourceId: string;
  readonly categorySlug: string;
}

interface SyncResult {
  readonly forumPostId: string | null;
  readonly error: string | null;
}

/* ── Helpers ── */

/**
 * Looks up a forum category by slug within the given clan.
 * Returns the category ID or null if not found.
 */
async function findCategoryId(supabase: SupabaseClient, clanId: string, slug: string): Promise<string | null> {
  const { data } = await supabase
    .from("forum_categories")
    .select("id")
    .eq("clan_id", clanId)
    .eq("slug", slug)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

/* ── Public API ── */

/**
 * Creates a forum post linked to an event or announcement.
 * Returns the new forum post ID, or an error message.
 *
 * Note: Update and delete sync are handled by database triggers
 * (see Documentation/migrations/forum_thread_linking.sql).
 */
export async function createLinkedForumPost(
  supabase: SupabaseClient,
  params: CreateLinkedPostParams,
): Promise<SyncResult> {
  const categoryId = await findCategoryId(supabase, params.clanId, params.categorySlug);
  const { data, error } = await supabase
    .from("forum_posts")
    .insert({
      clan_id: params.clanId,
      author_id: params.authorId,
      title: params.title,
      content: params.content || null,
      category_id: categoryId,
      source_type: params.sourceType,
      source_id: params.sourceId,
    })
    .select("id")
    .single();
  if (error) {
    return { forumPostId: null, error: error.message };
  }
  return { forumPostId: data.id as string, error: null };
}
