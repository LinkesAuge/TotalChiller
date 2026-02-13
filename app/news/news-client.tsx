"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import { formatLocalDateTime } from "../../lib/date-format";
import { extractAuthorName } from "../../lib/dashboard-utils";
import { BANNER_PRESETS } from "@/lib/constants/banner-presets";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";
import DatePicker from "../components/date-picker";
import SearchInput from "../components/ui/search-input";
import BannerPicker from "../components/banner-picker";
import MarkdownEditor from "../components/markdown-editor";
import dynamic from "next/dynamic";
import SectionHero from "../components/section-hero";
import DataState from "../components/data-state";
import PaginationBar from "../components/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import { createLinkedForumPost } from "@/lib/forum-thread-sync";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-32 rounded" />,
});

const STORAGE_BUCKET = "forum-images";

/**
 * Pre-processes plain-text or loosely-formatted content so that
 * react-markdown renders it with correct line breaks and lists.
 *
 * - Converts bullet character `•` to markdown `- `
 * - Converts lines starting with `–` or `—` (em-dash) to `- `
 * - Adds trailing double-space before single newlines → `<br>` in markdown
 * - Preserves existing double newlines (paragraph breaks)
 * - Preserves markdown list / heading formatting
 */
/* ─── Types ─── */

interface ArticleRow {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: readonly string[];
  readonly created_at: string;
  readonly updated_at: string | null;
  readonly author_name: string | null;
  readonly banner_url: string | null;
  readonly updated_by: string | null;
  readonly editor_name: string | null;
  readonly forum_post_id: string | null;
}

const ARTICLE_SCHEMA = z.object({
  title: z.string().min(3),
  content: z.string().min(5),
  isPinned: z.boolean(),
  status: z.enum(["draft", "pending", "published"]),
  tags: z.array(z.string()).optional(),
  bannerUrl: z.string().nullable().optional(),
});

/* ─── Component ─── */

function NewsClient(): JSX.Element {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const t = useTranslations("news");
  const locale = useLocale();

  /* ── Permission state ── */
  const { isContentManager: canManage } = useUserRole(supabase);
  const { userId: authUserId } = useAuth();
  const currentUserId = authUserId ?? "";

  /* ── Data state ── */
  const [articles, setArticles] = useState<readonly ArticleRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  /* ── Pagination ── */
  const pagination = usePagination(totalCount, 10);

  /* ── Filter state ── */
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  /* ── Form state ── */
  const editFormRef = useRef<HTMLElement>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "pending" | "published">("published");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [tagsInput, setTagsInput] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isBannerUploading, setIsBannerUploading] = useState<boolean>(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  /* ── Expanded article detail ── */
  const [expandedArticleId, setExpandedArticleId] = useState<string>("");

  const tags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [tagsInput]);

  /* ── Load articles ── */

  const loadArticles = useCallback(async (): Promise<void> => {
    if (!clanContext?.clanId) {
      setArticles([]);
      setIsLoading(false);
      setTotalCount(0);
      return;
    }
    setIsLoading(true);
    const fromIndex = pagination.startIndex;
    const toIndex = fromIndex + pagination.pageSize - 1;
    /* Select with embedded profile joins for author + editor names */
    const selectCols =
      "id,title,content,type,is_pinned,status,tags,created_at,updated_at,created_by,banner_url,updated_by,forum_post_id," +
      "author:profiles!articles_created_by_profiles_fkey(display_name,username)," +
      "editor:profiles!articles_updated_by_profiles_fkey(display_name,username)";
    let query = supabase.from("articles").select(selectCols, { count: "exact" }).eq("clan_id", clanContext.clanId);
    if (tagFilter !== "all") query = query.contains("tags", [tagFilter]);
    if (searchTerm.trim()) query = query.or(`title.ilike.%${searchTerm.trim()}%,content.ilike.%${searchTerm.trim()}%`);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
    const { data, error, count } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);
    setIsLoading(false);
    if (error) {
      pushToast(`${t("loadError")}: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    setArticles(
      rows.map((row) => ({
        ...row,
        author_name: extractAuthorName(row.author as { display_name: string | null; username: string | null } | null),
        editor_name: extractAuthorName(row.editor as { display_name: string | null; username: string | null } | null),
      })) as ArticleRow[],
    );
    setTotalCount(count ?? 0);
    /* usePagination auto-clamps page when totalItems shrinks */
  }, [
    supabase,
    clanContext,
    tagFilter,
    searchTerm,
    dateFrom,
    dateTo,
    pagination.startIndex,
    pagination.pageSize,
    pushToast,
    t,
  ]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const availableTags = useMemo(() => {
    const s = new Set<string>();
    articles.forEach((a) => a.tags.forEach((tag) => s.add(tag)));
    return Array.from(s).sort();
  }, [articles]);

  /* ── Form helpers ── */

  function resetForm(): void {
    setTitle("");
    setContent("");
    setStatus("published");
    setIsPinned(false);
    setTagsInput("");
    setBannerUrl("");
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
    setStatus(article.status as "draft" | "pending" | "published");
    setIsPinned(article.is_pinned);
    setTagsInput(article.tags.join(", "));
    setBannerUrl(article.banner_url ?? "");
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ── Banner upload ── */
  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    setIsBannerUploading(true);
    const path = `${currentUserId}/${Date.now()}_banner_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
    setIsBannerUploading(false);
    if (uploadErr) {
      pushToast(`${t("saveError")}: ${uploadErr.message}`);
      return;
    }
    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    setBannerUrl(urlData.publicUrl);
  }

  /* ── Submit ── */

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanContext?.clanId) {
      pushToast(t("selectClanFirst"));
      return;
    }
    const parsed = ARTICLE_SCHEMA.safeParse({ title, content, status, isPinned, tags, bannerUrl: bannerUrl || null });
    if (!parsed.success) {
      pushToast(t("checkFormValues"));
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      pushToast(t("mustBeLoggedIn"));
      return;
    }
    const isNewPost = !editingId;
    const sharedFields = {
      clan_id: clanContext.clanId,
      title: parsed.data.title,
      content: parsed.data.content,
      type: "announcement",
      status: parsed.data.status,
      is_pinned: parsed.data.isPinned,
      tags: parsed.data.tags ?? [],
      banner_url: parsed.data.bannerUrl ?? null,
    };
    /* For new posts: set created_by. For edits: set updated_by, never overwrite created_by */
    const payload = isNewPost ? { ...sharedFields, created_by: userId } : { ...sharedFields, updated_by: userId };
    setIsSaving(true);
    let { data: insertedData, error } = editingId
      ? await supabase.from("articles").update(payload).eq("id", editingId).select("id").maybeSingle()
      : await supabase.from("articles").insert(payload).select("id").single();
    /* If new columns missing, retry without them */
    if (error && (error.message.includes("banner_url") || error.message.includes("updated_by"))) {
      const { banner_url: _b, updated_by: _u, ...payloadClean } = payload as Record<string, unknown>;
      const retry = editingId
        ? await supabase.from("articles").update(payloadClean).eq("id", editingId).select("id").maybeSingle()
        : await supabase.from("articles").insert(payloadClean).select("id").single();
      insertedData = retry.data;
      error = retry.error;
    }
    setIsSaving(false);
    if (error) {
      pushToast(`${t("saveError")}: ${error.message}`);
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
          title: `${t("newAnnouncement")}: ${parsed.data.title}`,
          body: parsed.data.content.slice(0, 100),
        }),
      });
      /* Create linked forum thread */
      const { forumPostId } = await createLinkedForumPost(supabase, {
        clanId: clanContext.clanId,
        authorId: userId,
        title: parsed.data.title,
        content: parsed.data.content,
        sourceType: "announcement",
        sourceId: insertedData.id as string,
        categorySlug: "announcements",
      });
      if (forumPostId) {
        await supabase
          .from("articles")
          .update({ forum_post_id: forumPostId })
          .eq("id", insertedData.id as string);
      }
    }
    /* Edit sync is handled by DB trigger trg_article_update_sync_forum */
    pushToast(editingId ? t("postUpdated") : t("postCreated"));
    resetForm();
    await loadArticles();
  }

  /* ── Delete ── */
  async function handleDeleteArticle(articleId: string): Promise<void> {
    if (!window.confirm(t("confirmDelete"))) return;
    /* DB trigger (trg_article_delete_forum_post) auto-deletes the linked forum thread */
    const { error } = await supabase.from("articles").delete().eq("id", articleId);
    if (error) {
      pushToast(`${t("deleteError")}: ${error.message}`);
      return;
    }
    setArticles((c) => c.filter((a) => a.id !== articleId));
    setTotalCount((c) => Math.max(0, c - 1));
    pushToast(t("postDeleted"));
  }

  /* ── Filter helpers ── */
  function handleClearFilters(): void {
    setTagFilter("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    pagination.setPage(1);
  }
  const hasActiveFilters = tagFilter !== "all" || searchTerm.trim() !== "" || dateFrom !== "" || dateTo !== "";

  /* ── Shared form JSX ── */
  function renderForm(): JSX.Element {
    return (
      <section className="card col-span-full" ref={editFormRef}>
        <div className="card-header">
          <div>
            <div className="card-title">{editingId ? t("editPost") : t("createPost")}</div>
            <div className="card-subtitle">{t("visibleToClan")}</div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="pt-0 px-4 pb-4">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="newsTitle">{t("titleLabel")}</label>
            <input
              id="newsTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          {/* Banner selection */}
          <div className="form-group">
            <label id="newsBannerLabel">{t("bannerLabel")}</label>
            <BannerPicker
              presets={BANNER_PRESETS}
              value={bannerUrl}
              onChange={setBannerUrl}
              onUpload={handleBannerUpload}
              isUploading={isBannerUploading}
              fileRef={bannerFileRef}
              labelId="newsBannerLabel"
            />
          </div>

          {/* Content editor */}
          <div className="form-group">
            <label htmlFor="newsContent">{t("contentLabel")}</label>
            <MarkdownEditor
              id="newsContent"
              value={content}
              onChange={setContent}
              supabase={supabase}
              userId={currentUserId}
              placeholder={t("contentPlaceholder")}
              rows={14}
              minHeight={250}
            />
          </div>

          {/* Status, Tags, Pin */}
          <div className="form-grid">
            <div className="form-group mb-0">
              <label htmlFor="newsStatus">{t("status")}</label>
              <RadixSelect
                id="newsStatus"
                ariaLabel={t("status")}
                value={status}
                onValueChange={(v) => setStatus(v as "draft" | "pending" | "published")}
                options={[
                  { value: "draft", label: t("draft") },
                  { value: "pending", label: t("pending") },
                  { value: "published", label: t("published") },
                ]}
              />
            </div>
            <div className="form-group mb-0">
              <label htmlFor="newsTags">{t("tags")}</label>
              <input
                id="newsTags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={t("tagsPlaceholder")}
              />
            </div>
          </div>
          <div className="list inline mt-3">
            <label className="text-muted inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                style={{ accentColor: "var(--color-gold)" }}
              />
              {t("pinLabel")}
            </label>
          </div>
          <div className="list inline mt-4">
            <button className="button primary" type="submit" disabled={isSaving}>
              {isSaving ? t("saving") : editingId ? t("save") : t("createPost")}
            </button>
            <button className="button" type="button" onClick={resetForm}>
              {t("cancel")}
            </button>
          </div>
        </form>
      </section>
    );
  }

  /* ── Render ── */
  return (
    <>
      <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
      <SectionHero title={t("heroTitle")} subtitle={t("heroSubtitle")} bannerSrc="/assets/banners/banner_chest.png" />

      <div className="content-inner">
        {/* Create button */}
        {!isFormOpen && canManage && (
          <div className="mb-4">
            <button className="button primary" type="button" onClick={handleOpenCreate}>
              {t("createPost")}
            </button>
          </div>
        )}

        <div className="grid">
          {/* ═══ Create Form (top position — only for new posts) ═══ */}
          {isFormOpen && !editingId && canManage && renderForm()}

          {/* ═══ Pagination ═══ */}
          <div className="col-span-full">
            <PaginationBar pagination={pagination} pageSizeOptions={[10, 25, 50]} idPrefix="news" />
          </div>

          <DataState
            isLoading={isLoading}
            isEmpty={articles.length === 0}
            loadingMessage={t("loadingNews")}
            emptyMessage={t("noNews")}
            className="col-span-full"
          >
            {articles.map((article) => {
              const isExpanded = expandedArticleId === article.id;
              const isBeingEdited = isFormOpen && editingId === article.id;
              return (
                <React.Fragment key={article.id}>
                  <article className="news-card col-span-full">
                    {/* Banner header */}
                    <div
                      className="news-card-banner"
                      onClick={() => setExpandedArticleId(isExpanded ? "" : article.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedArticleId(isExpanded ? "" : article.id);
                        }
                      }}
                    >
                      <img
                        src={article.banner_url || "/assets/banners/banner_gold_dragon.png"}
                        alt=""
                        className="news-card-banner-img"
                      />
                      <div className="news-card-banner-overlay" />
                      {/* Decorative line */}
                      <Image
                        src="/assets/vip/components_decor_6.png"
                        alt=""
                        className="news-card-decor"
                        width={240}
                        height={12}
                      />
                      {/* Title + meta over banner */}
                      <div className="news-card-banner-content">
                        <h3 className="news-card-title">{article.title}</h3>
                        <div className="news-card-meta">
                          <span>{formatLocalDateTime(article.created_at, locale)}</span>
                          {article.author_name && (
                            <>
                              <span className="news-card-meta-sep">&bull;</span>
                              <span>{t("author", { name: article.author_name })}</span>
                            </>
                          )}
                          {article.editor_name && article.updated_at && (
                            <>
                              <span className="news-card-meta-sep">&bull;</span>
                              <span className="news-card-edited">
                                {t("editedBy", {
                                  name: article.editor_name,
                                  date: formatLocalDateTime(article.updated_at, locale),
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Badges */}
                      <div className="news-card-badges">
                        {article.is_pinned && <span className="news-card-badge pinned">{t("pinned")}</span>}
                        <span className="news-card-badge status">
                          {t(article.status as "draft" | "pending" | "published")}
                        </span>
                      </div>
                    </div>

                    {/* Content preview (truncated) — always visible */}
                    {!isExpanded && article.content && (
                      <div
                        className="news-card-preview"
                        onClick={() => setExpandedArticleId(article.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedArticleId(article.id);
                          }
                        }}
                      >
                        <AppMarkdown content={article.content} />
                        <div className="news-card-fade" />
                        <span className="news-card-read-more">{t("readMore")}</span>
                      </div>
                    )}

                    {/* Expanded full content */}
                    {isExpanded && (
                      <div className="news-card-body">
                        <AppMarkdown content={article.content} />
                        <div className="news-card-collapse-row">
                          <button
                            className="news-card-collapse-btn"
                            type="button"
                            onClick={() => setExpandedArticleId("")}
                          >
                            {t("showLess")}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {article.tags.length > 0 && (
                      <div className="news-card-tags">
                        {article.tags.map((tag) => (
                          <span className="news-card-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="news-card-actions">
                      {article.forum_post_id && (
                        <a className="button" href={`/forum?post=${article.forum_post_id}`}>
                          {t("goToThread")}
                        </a>
                      )}
                      {canManage && (
                        <>
                          <button className="button" type="button" onClick={() => handleEditArticle(article)}>
                            {t("editPost")}
                          </button>
                          <button
                            className="button danger"
                            type="button"
                            onClick={() => handleDeleteArticle(article.id)}
                          >
                            {t("deletePost")}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                  {isBeingEdited && canManage && renderForm()}
                </React.Fragment>
              );
            })}
          </DataState>

          {/* ═══ Filters ═══ */}
          <section className="card col-span-full">
            <div className="card-header">
              <div>
                <div className="card-title">{t("filters")}</div>
              </div>
              {hasActiveFilters && (
                <button className="button text-[0.8rem]" type="button" onClick={handleClearFilters}>
                  {t("clearFilters")}
                </button>
              )}
            </div>
            <div className="form-grid pt-0 px-4 pb-4" style={{ gap: "12px 16px" }}>
              <div className="form-group mb-0">
                <label htmlFor="newsSearch">{t("search")}</label>
                <SearchInput
                  id="newsSearch"
                  label=""
                  value={searchTerm}
                  onChange={(v) => {
                    setSearchTerm(v);
                    pagination.setPage(1);
                  }}
                  placeholder={t("searchPlaceholder")}
                />
              </div>
              {availableTags.length > 0 && (
                <div className="form-group mb-0">
                  <label htmlFor="newsTagFilter">{t("filterByTag")}</label>
                  <RadixSelect
                    id="newsTagFilter"
                    ariaLabel={t("filterByTag")}
                    value={tagFilter}
                    onValueChange={(v) => {
                      setTagFilter(v);
                      pagination.setPage(1);
                    }}
                    options={[
                      { value: "all", label: t("all") },
                      ...availableTags.map((tag) => ({ value: tag, label: tag })),
                    ]}
                  />
                </div>
              )}
              <div className="form-group mb-0">
                <label>{t("filterByDate")}</label>
                <div className="flex gap-2 items-center">
                  <DatePicker
                    value={dateFrom}
                    onChange={(v) => {
                      setDateFrom(v);
                      pagination.setPage(1);
                    }}
                  />
                  <span className="text-muted">–</span>
                  <DatePicker
                    value={dateTo}
                    onChange={(v) => {
                      setDateTo(v);
                      pagination.setPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default NewsClient;
