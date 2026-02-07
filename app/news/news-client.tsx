"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import formatGermanDateTime from "../../lib/date-format";
import useClanContext from "../components/use-clan-context";
import ClanScopeBanner from "../components/clan-scope-banner";
import AuthActions from "../components/auth-actions";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";
import QuickActions from "../components/quick-actions";
import SectionHero from "../components/section-hero";

interface ArticleRow {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: readonly string[];
  readonly created_at: string;
}

const ARTICLE_SCHEMA = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  type: z.enum(["news", "announcement"]),
  isPinned: z.boolean(),
  status: z.enum(["draft", "pending", "published"]),
  tags: z.array(z.string()).optional(),
});

/**
 * Full news & announcements client component with CRUD, filters, and pinned-first sorting.
 */
function NewsClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const { pushToast } = useToast();

  /* ── Data state ── */
  const [articles, setArticles] = useState<readonly ArticleRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* ── Form state ── */
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [type, setType] = useState<"news" | "announcement">("news");
  const [status, setStatus] = useState<"draft" | "pending" | "published">("published");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [tagsInput, setTagsInput] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const tags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter((item) => Boolean(item));
  }, [tagsInput]);

  /* ── Load articles ── */

  useEffect(() => {
    async function loadArticles(): Promise<void> {
      if (!clanContext?.clanId) {
        setArticles([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      let query = supabase
        .from("articles")
        .select("id,title,content,type,is_pinned,status,tags,created_at")
        .eq("clan_id", clanContext.clanId);
      if (tagFilter !== "all") {
        query = query.contains("tags", [tagFilter]);
      }
      const { data, error } = await query
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setIsLoading(false);
      if (error) {
        pushToast(`Failed to load news: ${error.message}`);
        return;
      }
      setArticles((data ?? []) as ArticleRow[]);
    }
    void loadArticles();
  }, [clanContext?.clanId, pushToast, supabase, tagFilter]);

  /* ── Reload helper ── */

  async function reloadArticles(): Promise<void> {
    if (!clanContext?.clanId) return;
    let query = supabase
      .from("articles")
      .select("id,title,content,type,is_pinned,status,tags,created_at")
      .eq("clan_id", clanContext.clanId);
    if (tagFilter !== "all") {
      query = query.contains("tags", [tagFilter]);
    }
    const { data, error } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      pushToast(`Failed to refresh posts: ${error.message}`);
      return;
    }
    setArticles((data ?? []) as ArticleRow[]);
  }

  /* ── Form helpers ── */

  function resetForm(): void {
    setTitle("");
    setContent("");
    setType("news");
    setStatus("published");
    setIsPinned(false);
    setTagsInput("");
    setEditingId("");
    setIsFormOpen(false);
  }

  function handleOpenCreate(): void {
    resetForm();
    setIsFormOpen(true);
  }

  function handleEditArticle(article: ArticleRow): void {
    setEditingId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setType(article.type as "news" | "announcement");
    setStatus(article.status as "draft" | "pending" | "published");
    setIsPinned(article.is_pinned);
    setTagsInput(article.tags.join(", "));
    setIsFormOpen(true);
  }

  /* ── Submit ── */

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanContext?.clanId) {
      pushToast("Select a clan first.");
      return;
    }
    const parsed = ARTICLE_SCHEMA.safeParse({
      title,
      content,
      type,
      status,
      isPinned,
      tags,
    });
    if (!parsed.success) {
      pushToast("Check your form values.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      pushToast("You must be logged in.");
      return;
    }
    const payload = {
      clan_id: clanContext.clanId,
      title: parsed.data.title,
      content: parsed.data.content,
      type: parsed.data.type,
      status: parsed.data.status,
      is_pinned: parsed.data.isPinned,
      tags: parsed.data.tags ?? [],
      created_by: userId,
    };
    setIsSaving(true);
    const isNewPost = !editingId;
    const { data: insertedData, error } = editingId
      ? await supabase.from("articles").update(payload).eq("id", editingId).select("id").maybeSingle()
      : await supabase.from("articles").insert(payload).select("id").single();
    setIsSaving(false);
    if (error) {
      pushToast(`Failed to save post: ${error.message}`);
      return;
    }
    if (isNewPost && insertedData?.id) {
      void fetch("/api/notifications/fan-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "news",
          reference_id: insertedData.id as string,
          clan_id: clanContext.clanId,
          title: `New post: ${parsed.data.title}`,
          body: parsed.data.content.slice(0, 100),
        }),
      });
    }
    pushToast(editingId ? "Post updated." : "Post created.");
    resetForm();
    await reloadArticles();
  }

  /* ── Delete ── */

  async function handleDeleteArticle(articleId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this post?");
    if (!confirmDelete) return;
    const { error } = await supabase.from("articles").delete().eq("id", articleId);
    if (error) {
      pushToast(`Failed to delete post: ${error.message}`);
      return;
    }
    setArticles((current) => current.filter((item) => item.id !== articleId));
    pushToast("Post deleted.");
  }

  /* ── Derived data ── */

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    articles.forEach((article) => {
      article.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [articles]);

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">The Chillers &bull; News</div>
            <h1 className="top-bar-title">News &amp; Announcements</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!isFormOpen && (
              <button className="button primary" type="button" onClick={handleOpenCreate}>
                Create Post
              </button>
            )}
            <AuthActions />
          </div>
        </div>
      </div>
      <QuickActions />
      <SectionHero
        title="Newsroom"
        subtitle="Clan updates, priorities, and community announcements."
        bannerSrc="/assets/banners/banner_chest.png"
      />

      <div className="content-inner">
      <div className="grid">
        <ClanScopeBanner />

        {/* ── Create / Edit Form (collapsible) ── */}
        {isFormOpen && (
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? "Edit Post" : "Create Post"}</div>
                <div className="card-subtitle">Visible to the selected clan</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="newsTitle">Title</label>
                <input
                  id="newsTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="newsContent">Content</label>
                <textarea
                  id="newsContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the announcement"
                  rows={5}
                />
              </div>
              <div className="form-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="newsType">Type</label>
                  <RadixSelect
                    id="newsType"
                    ariaLabel="Type"
                    value={type}
                    onValueChange={(v) => setType(v as "news" | "announcement")}
                    options={[
                      { value: "news", label: "News" },
                      { value: "announcement", label: "Announcement" },
                    ]}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="newsStatus">Status</label>
                  <RadixSelect
                    id="newsStatus"
                    ariaLabel="Status"
                    value={status}
                    onValueChange={(v) => setStatus(v as "draft" | "pending" | "published")}
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "pending", label: "Pending" },
                      { value: "published", label: "Published" },
                    ]}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="newsTags">Tags</label>
                  <input
                    id="newsTags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="comma, separated, tags"
                  />
                </div>
              </div>
              <div className="list inline" style={{ marginTop: 12 }}>
                <label className="text-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  Pin this post
                </label>
              </div>
              <div className="list inline" style={{ marginTop: 16 }}>
                <button className="button primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : editingId ? "Save Changes" : "Create Post"}
                </button>
                <button className="button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Tag Filter ── */}
        {availableTags.length > 0 && (
          <section className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="filter-bar list inline" style={{ gap: 16, alignItems: "flex-end" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="tagFilter">Filter by tag</label>
                <RadixSelect
                  id="tagFilter"
                  ariaLabel="Tag"
                  value={tagFilter}
                  onValueChange={(v) => setTagFilter(v)}
                  options={[
                    { value: "all", label: "All" },
                    ...availableTags.map((tag) => ({ value: tag, label: tag })),
                  ]}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="alert info loading" style={{ gridColumn: "1 / -1" }}>
            Loading posts…
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && articles.length === 0 && (
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">No posts yet</div>
                <div className="card-subtitle">Create the first announcement</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Article list ── */}
        {!isLoading &&
          articles.map((article) => (
            <section className="card" key={article.id} style={{ gridColumn: "1 / -1" }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{article.title}</div>
                  <div className="card-subtitle">
                    {article.type} • {formatGermanDateTime(article.created_at)}
                  </div>
                </div>
                <div className="list inline" style={{ marginTop: 0, gap: 8 }}>
                  {article.is_pinned && <span className="badge">Pinned</span>}
                  <span className="badge">{article.status}</span>
                </div>
              </div>
              <p>{article.content}</p>
              {article.tags.length > 0 && (
                <div className="list inline" style={{ marginTop: 12 }}>
                  {article.tags.map((tag) => (
                    <span className="badge" key={tag}>{tag}</span>
                  ))}
                </div>
              )}
              <div className="list inline" style={{ marginTop: 12 }}>
                <button className="button" type="button" onClick={() => handleEditArticle(article)}>
                  Edit
                </button>
                <button className="button danger" type="button" onClick={() => handleDeleteArticle(article.id)}>
                  Delete
                </button>
              </div>
            </section>
          ))}
      </div>
      </div>
    </>
  );
}

export default NewsClient;
