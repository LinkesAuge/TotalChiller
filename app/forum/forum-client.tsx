"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";
import ForumMarkdown, { extractThumbnail, type PostThumbnail } from "./forum-markdown";
import MarkdownToolbar, { handleImagePaste, handleImageDrop } from "./markdown-toolbar";

/* ─── Types ─── */

import type { ForumCategory } from "@/lib/types/domain";

interface ForumPost {
  readonly id: string;
  readonly category_id: string | null;
  readonly author_id: string;
  readonly title: string;
  readonly content: string | null;
  readonly is_pinned: boolean;
  readonly is_locked: boolean;
  readonly score: number;
  readonly comment_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  /* resolved client-side */
  authorName?: string;
  categoryName?: string;
  categorySlug?: string;
  userVote?: number; // -1, 0, 1
}

interface ForumComment {
  readonly id: string;
  readonly post_id: string;
  readonly parent_comment_id: string | null;
  readonly author_id: string;
  readonly content: string;
  readonly score: number;
  readonly created_at: string;
  authorName?: string;
  userVote?: number;
  replies?: ForumComment[];
}

type SortMode = "hot" | "new" | "top";
type ViewMode = "list" | "detail" | "create" | "edit";

/* ─── Constants ─── */

/** No fallback categories — categories are managed via Admin > Forum. */

const PAGE_SIZE = 20;

/* ─── Helpers ─── */

function formatTimeAgo(dateStr: string, t: ReturnType<typeof useTranslations>): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("hoursAgo", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t("daysAgo", { count: diffDay });
}

/** Compute "hot" rank: log2(max(|score|,1)) + age_hours/6 for recency bias. */
function computeHotRank(score: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const magnitude = Math.log2(Math.max(Math.abs(score), 1) + 1);
  const sign = score >= 0 ? 1 : -1;
  return sign * magnitude - ageHours / 6;
}

async function resolveAuthorNames(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, display_name, username").in("id", unique);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.display_name || row.username || "Unknown";
  }
  return map;
}

/* ─── Vote Arrow SVGs ─── */

function UpArrow(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function DownArrow(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

function CommentIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

/* ─── Thumbnail component for post list ─── */

function PostThumbnailBox({ thumbnail }: { readonly thumbnail: PostThumbnail | null }): JSX.Element | null {
  if (!thumbnail) return null;

  /* Image or YouTube — show actual thumbnail */
  if (thumbnail.thumbnailUrl) {
    return (
      <div className="forum-thumb">
        <img src={thumbnail.thumbnailUrl} alt="" loading="lazy" className="forum-thumb-img" />
        {thumbnail.type === "youtube" && <span className="forum-thumb-play">&#9654;</span>}
      </div>
    );
  }

  /* Video without thumbnail (direct mp4/webm) */
  if (thumbnail.type === "video") {
    return (
      <div className="forum-thumb forum-thumb-icon">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  /* External link / article */
  if (thumbnail.type === "link") {
    return (
      <div className="forum-thumb forum-thumb-icon">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      </div>
    );
  }

  return null;
}

/* ─── Main Component ─── */

/**
 * Reddit-style forum client component.
 * Manages list/detail/create views and all forum interactions.
 */
function ForumClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const t = useTranslations("forum");
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCategorySlug = searchParams.get("category") ?? "";

  /* State */
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortMode, setSortMode] = useState<SortMode>("new");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  /* Whether forum tables exist in the DB (migration may not have been run) */
  const [tablesReady, setTablesReady] = useState<boolean>(true);

  /* Create/edit form */
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formPinned, setFormPinned] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);

  /* Comment form */
  const [commentText, setCommentText] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<string>(""); // comment id
  const [replyText, setReplyText] = useState<string>("");

  /* Delete confirmation */
  const [deletingPostId, setDeletingPostId] = useState<string>("");

  const detailRef = useRef<HTMLElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  /* ─── Auth + permissions ─── */
  const { isContentManager: canManage } = useUserRole(supabase);
  const { userId: authUserId } = useAuth();
  const currentUserId = authUserId ?? "";

  /* ─── Load categories ─── */
  useEffect(() => {
    async function loadCategories(): Promise<void> {
      if (!clanContext) return;
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("clan_id", clanContext.clanId)
        .order("sort_order", { ascending: true });
      if (error) {
        const isTableMissing = error.message.includes("schema cache") || error.code === "PGRST204";
        if (isTableMissing) {
          setTablesReady(false);
        }
        setCategories([]);
        return;
      }
      setCategories((data ?? []) as ForumCategory[]);
    }
    void loadCategories();
  }, [supabase, clanContext]);

  /* ─── Sync URL category slug → selectedCategory ID ─── */
  useEffect(() => {
    if (categories.length === 0) return;
    if (!urlCategorySlug) {
      setSelectedCategory("");
      return;
    }
    const match = categories.find((c) => c.slug === urlCategorySlug);
    setSelectedCategory(match ? match.id : "");
  }, [urlCategorySlug, categories]);

  /* ─── Load posts ─── */
  const loadPosts = useCallback(async (): Promise<void> => {
    if (!clanContext || !tablesReady) {
      setIsLoading(false);
      setPosts([]);
      return;
    }
    setIsLoading(true);
    let query = supabase.from("forum_posts").select("*", { count: "exact" }).eq("clan_id", clanContext.clanId);
    if (selectedCategory) {
      query = query.eq("category_id", selectedCategory);
    }
    if (searchTerm.trim()) {
      query = query.or(`title.ilike.%${searchTerm.trim()}%,content.ilike.%${searchTerm.trim()}%`);
    }
    /* Pinned posts always first, then apply the chosen sort */
    query = query.order("is_pinned", { ascending: false });
    if (sortMode === "new") {
      query = query.order("created_at", { ascending: false });
    } else if (sortMode === "top") {
      query = query.order("score", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    const fromIdx = (page - 1) * PAGE_SIZE;
    const toIdx = fromIdx + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(fromIdx, toIdx);
    if (error) {
      const isTableMissing = error.message.includes("schema cache") || error.code === "PGRST204";
      if (isTableMissing) {
        setTablesReady(false);
      }
      setIsLoading(false);
      setPosts([]);
      return;
    }
    const rawPosts = (data ?? []) as ForumPost[];
    setTotalCount(count ?? 0);
    /* Resolve authors + categories + votes */
    const authorIds = rawPosts.map((p) => p.author_id);
    const nameMap = await resolveAuthorNames(supabase, authorIds);
    const catMap: Record<string, { name: string; slug: string }> = {};
    for (const cat of categories) {
      catMap[cat.id] = { name: cat.name, slug: cat.slug };
    }
    /* Fetch user's votes on these posts */
    let voteMap: Record<string, number> = {};
    if (currentUserId && rawPosts.length > 0) {
      const postIds = rawPosts.map((p) => p.id);
      const { data: votes } = await supabase
        .from("forum_votes")
        .select("post_id, vote_type")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
      for (const v of votes ?? []) {
        voteMap[v.post_id] = v.vote_type;
      }
    }
    const enriched: ForumPost[] = rawPosts.map((p) => ({
      ...p,
      authorName: nameMap[p.author_id] ?? "Unknown",
      categoryName: p.category_id ? (catMap[p.category_id]?.name ?? "") : "",
      categorySlug: p.category_id ? (catMap[p.category_id]?.slug ?? "") : "",
      userVote: voteMap[p.id] ?? 0,
    }));
    /* Client-side "hot" sorting */
    if (sortMode === "hot") {
      enriched.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return computeHotRank(b.score, b.created_at) - computeHotRank(a.score, a.created_at);
      });
    }
    setPosts(enriched);
    setIsLoading(false);
  }, [supabase, clanContext, selectedCategory, sortMode, searchTerm, page, categories, currentUserId, tablesReady]);

  useEffect(() => {
    if (clanContext && categories.length > 0) {
      void loadPosts();
    }
  }, [loadPosts, clanContext, categories]);

  /* ─── Load comments for a post ─── */
  const loadComments = useCallback(
    async (postId: string): Promise<void> => {
      if (!tablesReady) {
        setComments([]);
        return;
      }
      const { data, error } = await supabase
        .from("forum_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) {
        return;
      }
      const rawComments = (data ?? []) as ForumComment[];
      const authorIds = rawComments.map((c) => c.author_id);
      const nameMap = await resolveAuthorNames(supabase, authorIds);
      /* Fetch user's votes on comments */
      let voteMap: Record<string, number> = {};
      if (currentUserId && rawComments.length > 0) {
        const commentIds = rawComments.map((c) => c.id);
        const { data: votes } = await supabase
          .from("forum_comment_votes")
          .select("comment_id, vote_type")
          .eq("user_id", currentUserId)
          .in("comment_id", commentIds);
        for (const v of votes ?? []) {
          voteMap[v.comment_id] = v.vote_type;
        }
      }
      /* Build thread tree */
      const enriched: ForumComment[] = rawComments.map((c) => ({
        ...c,
        authorName: nameMap[c.author_id] ?? "Unknown",
        userVote: voteMap[c.id] ?? 0,
        replies: [],
      }));
      const topLevel: ForumComment[] = [];
      const byId: Record<string, ForumComment> = {};
      for (const c of enriched) {
        byId[c.id] = c;
      }
      for (const c of enriched) {
        if (c.parent_comment_id && byId[c.parent_comment_id]) {
          byId[c.parent_comment_id].replies!.push(c);
        } else {
          topLevel.push(c);
        }
      }
      setComments(topLevel);
    },
    [supabase, currentUserId],
  );

  /* ─── Voting ─── */
  async function handleVotePost(postId: string, voteType: number): Promise<void> {
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const currentVote = post.userVote ?? 0;
    let newVote = voteType;
    if (currentVote === voteType) {
      /* Toggle off */
      newVote = 0;
      await supabase.from("forum_votes").delete().eq("post_id", postId).eq("user_id", currentUserId);
    } else {
      /* Upsert */
      await supabase
        .from("forum_votes")
        .upsert({ post_id: postId, user_id: currentUserId, vote_type: voteType }, { onConflict: "post_id,user_id" });
    }
    /* Update cached score */
    const scoreDelta = newVote - currentVote;
    const newScore = post.score + scoreDelta;
    await supabase.from("forum_posts").update({ score: newScore }).eq("id", postId);
    /* Optimistic update */
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, score: newScore, userVote: newVote } : p)));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => (prev ? { ...prev, score: newScore, userVote: newVote } : prev));
    }
  }

  async function handleVoteComment(commentId: string, voteType: number): Promise<void> {
    if (!currentUserId) return;
    /* Find comment in tree */
    function findComment(list: ForumComment[]): ForumComment | undefined {
      for (const c of list) {
        if (c.id === commentId) return c;
        const found = findComment(c.replies ?? []);
        if (found) return found;
      }
      return undefined;
    }
    const comment = findComment(comments);
    if (!comment) return;
    const currentVote = comment.userVote ?? 0;
    let newVote = voteType;
    if (currentVote === voteType) {
      newVote = 0;
      await supabase.from("forum_comment_votes").delete().eq("comment_id", commentId).eq("user_id", currentUserId);
    } else {
      await supabase
        .from("forum_comment_votes")
        .upsert(
          { comment_id: commentId, user_id: currentUserId, vote_type: voteType },
          { onConflict: "comment_id,user_id" },
        );
    }
    const scoreDelta = newVote - currentVote;
    const newScore = comment.score + scoreDelta;
    await supabase.from("forum_comments").update({ score: newScore }).eq("id", commentId);
    /* Optimistic update comments */
    function updateTree(list: ForumComment[]): ForumComment[] {
      return list.map((c) => {
        if (c.id === commentId) return { ...c, score: newScore, userVote: newVote };
        return { ...c, replies: updateTree(c.replies ?? []) };
      });
    }
    setComments((prev) => updateTree(prev));
  }

  /* ─── Create / Edit Post ─── */
  async function handleSubmitPost(): Promise<void> {
    if (!clanContext || !currentUserId || !formTitle.trim()) return;
    if (editingPostId) {
      const updatePayload: Record<string, unknown> = {
        title: formTitle.trim(),
        content: formContent.trim() || null,
        category_id: formCategoryId || null,
        updated_at: new Date().toISOString(),
      };
      if (canManage) {
        updatePayload.is_pinned = formPinned;
      }
      await supabase.from("forum_posts").update(updatePayload).eq("id", editingPostId);
    } else {
      const insertPayload: Record<string, unknown> = {
        clan_id: clanContext.clanId,
        author_id: currentUserId,
        title: formTitle.trim(),
        content: formContent.trim() || null,
        category_id: formCategoryId || null,
      };
      if (canManage && formPinned) {
        insertPayload.is_pinned = true;
      }
      await supabase.from("forum_posts").insert(insertPayload);
    }
    resetForm();
    setViewMode("list");
    setPage(1);
    void loadPosts();
  }

  function resetForm(): void {
    setFormTitle("");
    setFormContent("");
    setFormCategoryId("");
    setFormPinned(false);
    setEditingPostId("");
  }

  function handleOpenCreate(): void {
    resetForm();
    setViewMode("create");
  }

  function handleEditPost(post: ForumPost): void {
    setFormTitle(post.title);
    setFormContent(post.content ?? "");
    setFormCategoryId(post.category_id ?? "");
    setFormPinned(post.is_pinned);
    setEditingPostId(post.id);
    setViewMode("create");
  }

  /* ─── Delete Post ─── */
  async function handleConfirmDelete(): Promise<void> {
    if (!deletingPostId) return;
    await supabase.from("forum_posts").delete().eq("id", deletingPostId);
    setDeletingPostId("");
    if (viewMode === "detail") {
      setViewMode("list");
      setSelectedPost(null);
    }
    void loadPosts();
  }

  /* ─── Pin / Lock ─── */
  async function handleTogglePin(post: ForumPost): Promise<void> {
    await supabase.from("forum_posts").update({ is_pinned: !post.is_pinned }).eq("id", post.id);
    void loadPosts();
    if (selectedPost?.id === post.id) {
      setSelectedPost((prev) => (prev ? { ...prev, is_pinned: !prev.is_pinned } : prev));
    }
  }

  async function handleToggleLock(post: ForumPost): Promise<void> {
    await supabase.from("forum_posts").update({ is_locked: !post.is_locked }).eq("id", post.id);
    void loadPosts();
    if (selectedPost?.id === post.id) {
      setSelectedPost((prev) => (prev ? { ...prev, is_locked: !prev.is_locked } : prev));
    }
  }

  /* ─── Open Post Detail ─── */
  function handleOpenPost(post: ForumPost): void {
    setSelectedPost(post);
    setViewMode("detail");
    setCommentText("");
    setReplyingTo("");
    setReplyText("");
    void loadComments(post.id);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ─── Submit Comment ─── */
  async function handleSubmitComment(): Promise<void> {
    if (!currentUserId || !selectedPost || !commentText.trim()) return;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: selectedPost.id,
      author_id: currentUserId,
      content: commentText.trim(),
    });
    if (!error) {
      setCommentText("");
      /* Update comment count */
      await supabase
        .from("forum_posts")
        .update({
          comment_count: (selectedPost.comment_count ?? 0) + 1,
        })
        .eq("id", selectedPost.id);
      setSelectedPost((prev) => (prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev));
      void loadComments(selectedPost.id);
    }
  }

  async function handleSubmitReply(): Promise<void> {
    if (!currentUserId || !selectedPost || !replyText.trim() || !replyingTo) return;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: selectedPost.id,
      parent_comment_id: replyingTo,
      author_id: currentUserId,
      content: replyText.trim(),
    });
    if (!error) {
      setReplyText("");
      setReplyingTo("");
      await supabase
        .from("forum_posts")
        .update({
          comment_count: (selectedPost.comment_count ?? 0) + 1,
        })
        .eq("id", selectedPost.id);
      setSelectedPost((prev) => (prev ? { ...prev, comment_count: prev.comment_count + 1 } : prev));
      void loadComments(selectedPost.id);
    }
  }

  /* ─── No clan context ─── */
  if (!clanContext) {
    return (
      <>
        <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
        <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
        <div className="content-inner">
          <div className="forum-empty">
            <p>Please select a clan to view the forum.</p>
          </div>
        </div>
      </>
    );
  }

  /* ─── Forum tables not yet created ─── */
  if (!tablesReady) {
    return (
      <>
        <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
        <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
        <div className="content-inner">
          <div className="forum-empty">
            <p style={{ marginBottom: 8 }}>{t("emptyTitle")}</p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              The forum database tables have not been created yet. Please run the migration in{" "}
              <code>Documentation/migrations/forum_tables.sql</code> against your Supabase instance.
            </p>
          </div>
        </div>
      </>
    );
  }

  /* ═══ RENDER: Create / Edit Post ═══ */
  if (viewMode === "create") {
    return (
      <>
        <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
        <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
        <div className="content-inner">
          <button
            className="button"
            onClick={() => {
              resetForm();
              setViewMode("list");
            }}
            style={{ marginBottom: 16 }}
          >
            ← {t("backToForum")}
          </button>
          <section className="forum-form">
            <h3 className="card-title" style={{ marginBottom: 12 }}>
              {editingPostId ? t("editPost") : t("createPost")}
            </h3>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" htmlFor="post-title">
                {t("postTitle")}
              </label>
              <input
                id="post-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("postTitlePlaceholder")}
                maxLength={200}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" htmlFor="post-category">
                {t("category")}
              </label>
              <select
                id="post-category"
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-edge)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.84rem",
                }}
              >
                <option value="">{t("selectCategory")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            {canManage && (
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    color: "var(--color-text)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formPinned}
                    onChange={(e) => setFormPinned(e.target.checked)}
                    style={{ accentColor: "var(--color-gold)" }}
                  />
                  {t("pinPost")}
                </label>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" htmlFor="post-content">
                {t("postContent")}
              </label>
              <div className="forum-editor-tabs">
                <button
                  type="button"
                  className={`forum-editor-tab${!isPreviewMode ? " active" : ""}`}
                  onClick={() => setIsPreviewMode(false)}
                >
                  {t("write")}
                </button>
                <button
                  type="button"
                  className={`forum-editor-tab${isPreviewMode ? " active" : ""}`}
                  onClick={() => setIsPreviewMode(true)}
                >
                  {t("preview")}
                </button>
              </div>
              {isPreviewMode ? (
                <div className="forum-editor-preview">
                  {formContent.trim() ? (
                    <ForumMarkdown content={formContent} />
                  ) : (
                    <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("previewEmpty")}</p>
                  )}
                </div>
              ) : (
                <>
                  <MarkdownToolbar
                    textareaRef={contentTextareaRef}
                    value={formContent}
                    onChange={setFormContent}
                    supabase={supabase}
                    userId={currentUserId}
                  />
                  <textarea
                    id="post-content"
                    ref={contentTextareaRef}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder={t("postContentPlaceholder")}
                    rows={10}
                    onPaste={(e) =>
                      handleImagePaste(
                        e,
                        supabase,
                        currentUserId,
                        (md) => setFormContent((prev) => prev + md),
                        setIsImageUploading,
                      )
                    }
                    onDrop={(e) =>
                      handleImageDrop(
                        e,
                        supabase,
                        currentUserId,
                        (md) => setFormContent((prev) => prev + md),
                        setIsImageUploading,
                      )
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                </>
              )}
              <p className="forum-editor-hint">{t("markdownHint")}</p>
            </div>
            <div className="forum-form-row">
              <button className="button primary" onClick={handleSubmitPost} disabled={!formTitle.trim()}>
                {editingPostId ? t("save") : t("submit")}
              </button>
              <button
                className="button"
                onClick={() => {
                  resetForm();
                  setViewMode("list");
                }}
              >
                {t("cancel")}
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  /* ═══ RENDER: Post Detail ═══ */
  if (viewMode === "detail" && selectedPost) {
    const isAuthor = currentUserId === selectedPost.author_id;
    const canModerate = canManage || isAuthor;
    return (
      <>
        <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
        <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
        <div className="content-inner">
          <button className="button" onClick={() => setViewMode("list")} style={{ marginBottom: 16 }}>
            ← {t("backToForum")}
          </button>
          <section className="forum-detail-card" ref={detailRef}>
            <div className="forum-detail-header">
              {/* Vote column */}
              <div
                className="forum-vote-col"
                style={{ padding: "0 6px 0 0", background: "transparent", minWidth: "auto" }}
              >
                <button
                  className={`forum-vote-btn${selectedPost.userVote === 1 ? " upvoted" : ""}`}
                  onClick={() => handleVotePost(selectedPost.id, 1)}
                  aria-label={t("upvote")}
                  type="button"
                >
                  <UpArrow />
                </button>
                <span className="forum-vote-score">{selectedPost.score}</span>
                <button
                  className={`forum-vote-btn${selectedPost.userVote === -1 ? " downvoted" : ""}`}
                  onClick={() => handleVotePost(selectedPost.id, -1)}
                  aria-label={t("downvote")}
                  type="button"
                >
                  <DownArrow />
                </button>
              </div>
              <div style={{ flex: 1 }}>
                <div className="forum-post-meta">
                  {selectedPost.categoryName && <span className="forum-cat-badge">{selectedPost.categoryName}</span>}
                  <span>
                    {t("by")} <strong style={{ color: "var(--color-text)" }}>{selectedPost.authorName}</strong>
                  </span>
                  <span>{formatTimeAgo(selectedPost.created_at, t)}</span>
                  {selectedPost.is_pinned && <span className="forum-badge-pinned">{t("pinned")}</span>}
                  {selectedPost.is_locked && <span className="forum-badge-locked">{t("locked")}</span>}
                </div>
                <h2 className="forum-detail-title">{selectedPost.title}</h2>
              </div>
            </div>
            {selectedPost.content && (
              <div className="forum-detail-content">
                <ForumMarkdown content={selectedPost.content} />
              </div>
            )}
            <div className="forum-detail-actions">
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.78rem",
                  color: "var(--color-text-muted)",
                }}
              >
                <CommentIcon /> {selectedPost.comment_count} {t("comments")}
              </span>
              {canModerate && (
                <>
                  <button className="forum-mod-btn" onClick={() => handleEditPost(selectedPost)} type="button">
                    {t("editPost")}
                  </button>
                  <button
                    className="forum-mod-btn danger"
                    onClick={() => setDeletingPostId(selectedPost.id)}
                    type="button"
                  >
                    {t("deletePost")}
                  </button>
                </>
              )}
              {canManage && (
                <>
                  <button className="forum-mod-btn" onClick={() => handleTogglePin(selectedPost)} type="button">
                    {selectedPost.is_pinned ? t("unpin") : t("pin")}
                  </button>
                  <button className="forum-mod-btn" onClick={() => handleToggleLock(selectedPost)} type="button">
                    {selectedPost.is_locked ? t("unlock") : t("lock")}
                  </button>
                </>
              )}
            </div>
          </section>

          {/* Delete confirmation */}
          {deletingPostId && (
            <div className="card" style={{ marginTop: 12, borderColor: "var(--color-accent-red)" }}>
              <div className="card-header">
                <h4 className="card-title">{t("deleteConfirmTitle")}</h4>
              </div>
              <p style={{ padding: "0 16px 8px", fontSize: "0.84rem", color: "var(--color-text-2)" }}>
                {t("deleteConfirmText")}
              </p>
              <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
                <button className="button danger" onClick={handleConfirmDelete}>
                  {t("deleteConfirmButton")}
                </button>
                <button className="button" onClick={() => setDeletingPostId("")}>
                  {t("cancel")}
                </button>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <section className="forum-comments-section">
            <h3 className="card-title" style={{ marginBottom: 12 }}>
              {t("comments")} ({selectedPost.comment_count})
            </h3>

            {/* Add comment form */}
            {!selectedPost.is_locked && (
              <div className="forum-form" style={{ marginBottom: 16 }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("commentPlaceholder")}
                  rows={3}
                />
                <div className="forum-form-row">
                  <button className="button primary" onClick={handleSubmitComment} disabled={!commentText.trim()}>
                    {t("submitComment")}
                  </button>
                </div>
              </div>
            )}

            {/* Comment list */}
            {comments.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.84rem" }}>{t("noComments")}</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id}>
                {renderComment(comment, false)}
                {(comment.replies ?? []).map((reply) => (
                  <div key={reply.id} className="forum-reply">
                    {renderComment(reply, true)}
                  </div>
                ))}
                {/* Reply form */}
                {replyingTo === comment.id && !selectedPost.is_locked && (
                  <div className="forum-reply" style={{ paddingTop: 8, paddingBottom: 8 }}>
                    <div className="forum-form" style={{ padding: 10 }}>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t("replyPlaceholder")}
                        rows={2}
                        style={{ minHeight: 48 }}
                      />
                      <div className="forum-form-row">
                        <button
                          className="button primary"
                          onClick={handleSubmitReply}
                          disabled={!replyText.trim()}
                          style={{ fontSize: "0.75rem", padding: "4px 12px" }}
                        >
                          {t("submitReply")}
                        </button>
                        <button
                          className="button"
                          onClick={() => {
                            setReplyingTo("");
                            setReplyText("");
                          }}
                          style={{ fontSize: "0.75rem", padding: "4px 12px" }}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      </>
    );
  }

  /* ─── Render a single comment ─── */
  function renderComment(comment: ForumComment, isReply: boolean): JSX.Element {
    return (
      <div className="forum-comment">
        <div className="forum-comment-vote">
          <button
            className={`forum-vote-btn${comment.userVote === 1 ? " upvoted" : ""}`}
            onClick={() => handleVoteComment(comment.id, 1)}
            aria-label={t("upvote")}
            type="button"
          >
            <UpArrow />
          </button>
          <span className="forum-vote-score">{comment.score}</span>
          <button
            className={`forum-vote-btn${comment.userVote === -1 ? " downvoted" : ""}`}
            onClick={() => handleVoteComment(comment.id, -1)}
            aria-label={t("downvote")}
            type="button"
          >
            <DownArrow />
          </button>
        </div>
        <div className="forum-comment-body">
          <div className="forum-comment-meta">
            <strong>{comment.authorName}</strong> · {formatTimeAgo(comment.created_at, t)}
          </div>
          <div className="forum-comment-text">
            <ForumMarkdown content={comment.content} />
          </div>
          <div className="forum-comment-actions">
            {!isReply && selectedPost && !selectedPost.is_locked && (
              <button
                className="forum-comment-action-btn"
                onClick={() => {
                  setReplyingTo(comment.id);
                  setReplyText("");
                }}
                type="button"
              >
                {t("reply")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ═══ RENDER: Post List ═══ */
  return (
    <>
      <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
      <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
      <div className="content-inner">
        {/* Toolbar: sort + search + create */}
        <div className="forum-toolbar">
          <div className="forum-sort-group">
            <button
              className={`forum-sort-btn${sortMode === "hot" ? " active" : ""}`}
              onClick={() => {
                setSortMode("hot");
                setPage(1);
              }}
              type="button"
            >
              {t("sortHot")}
            </button>
            <button
              className={`forum-sort-btn${sortMode === "new" ? " active" : ""}`}
              onClick={() => {
                setSortMode("new");
                setPage(1);
              }}
              type="button"
            >
              {t("sortNew")}
            </button>
            <button
              className={`forum-sort-btn${sortMode === "top" ? " active" : ""}`}
              onClick={() => {
                setSortMode("top");
                setPage(1);
              }}
              type="button"
            >
              {t("sortTop")}
            </button>
          </div>
          <input
            type="text"
            className="form-input"
            placeholder={t("search")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            style={{
              maxWidth: 260,
              padding: "6px 10px",
              fontSize: "0.78rem",
              background: "var(--color-surface)",
              border: "1px solid var(--color-edge)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
            }}
          />
          <div style={{ marginLeft: "auto" }}>
            <button className="button primary" onClick={handleOpenCreate}>
              {t("newPost")}
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div className="forum-categories" style={{ marginBottom: 16 }}>
          <button
            className={`forum-cat-pill${!selectedCategory ? " active" : ""}`}
            onClick={() => {
              router.push("/forum");
              setPage(1);
            }}
            type="button"
          >
            {t("allCategories")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`forum-cat-pill${selectedCategory === cat.id ? " active" : ""}`}
              onClick={() => {
                router.push(`/forum?category=${cat.slug}`);
                setPage(1);
              }}
              type="button"
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Post list */}
        {isLoading ? (
          <div className="forum-empty">
            <p>Loading...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="forum-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p>{searchTerm ? t("noResults") : t("noPosts")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {posts.map((post) => (
              <div
                key={post.id}
                className="forum-post-card"
                onClick={() => handleOpenPost(post)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenPost(post);
                  }
                }}
              >
                {/* Vote column */}
                <div className="forum-vote-col" onClick={(e) => e.stopPropagation()}>
                  <button
                    className={`forum-vote-btn${post.userVote === 1 ? " upvoted" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleVotePost(post.id, 1);
                    }}
                    aria-label={t("upvote")}
                    type="button"
                  >
                    <UpArrow />
                  </button>
                  <span className="forum-vote-score">{post.score}</span>
                  <button
                    className={`forum-vote-btn${post.userVote === -1 ? " downvoted" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleVotePost(post.id, -1);
                    }}
                    aria-label={t("downvote")}
                    type="button"
                  >
                    <DownArrow />
                  </button>
                </div>
                {/* Thumbnail preview */}
                <PostThumbnailBox thumbnail={extractThumbnail(post.content)} />
                {/* Post body */}
                <div className="forum-post-body">
                  <div className="forum-post-meta">
                    {post.categoryName && <span className="forum-cat-badge">{post.categoryName}</span>}
                    <span>
                      {t("by")} {post.authorName}
                    </span>
                    <span>{formatTimeAgo(post.created_at, t)}</span>
                    {post.is_pinned && <span className="forum-badge-pinned">{t("pinned")}</span>}
                    {post.is_locked && <span className="forum-badge-locked">{t("locked")}</span>}
                  </div>
                  <h3 className="forum-post-title">{post.title}</h3>
                  {post.content && (
                    <div className="forum-post-preview">
                      <ForumMarkdown content={post.content} preview />
                    </div>
                  )}
                  <div className="forum-post-footer">
                    <span>
                      <CommentIcon /> {post.comment_count} {t("comments")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 16 }}>
            <button
              className="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ fontSize: "0.78rem", padding: "5px 12px" }}
            >
              ←
            </button>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-2)" }}>
              {t("showing", {
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, totalCount),
                total: totalCount,
              })}
            </span>
            <button
              className="button"
              disabled={page * PAGE_SIZE >= totalCount}
              onClick={() => setPage((p) => p + 1)}
              style={{ fontSize: "0.78rem", padding: "5px 12px" }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default ForumClient;
