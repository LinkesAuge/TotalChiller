"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsContentManager from "../../lib/supabase/role-access";
import { formatLocalDateTime } from "../../lib/date-format";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";
import IconButton from "../components/ui/icon-button";
import DatePicker from "../components/date-picker";
import SearchInput from "../components/ui/search-input";
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
  readonly author_name: string | null;
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
 * Full news & announcements client component with CRUD, filters, pagination, and pinned-first sorting.
 */
function NewsClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const t = useTranslations("news");
  const locale = useLocale();

  /* ── Permission state ── */
  const [canManage, setCanManage] = useState<boolean>(false);

  useEffect(() => {
    void getIsContentManager({ supabase }).then(setCanManage);
  }, [supabase]);

  /* ── Data state ── */
  const [articles, setArticles] = useState<readonly ArticleRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  /* ── Pagination state ── */
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const totalPages: number = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Filter state ── */
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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

  const tags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter((item) => Boolean(item));
  }, [tagsInput]);

  /** Resolve user IDs to display names via profiles table. */
  async function resolveAuthorNames(userIds: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)].filter(Boolean);
    const map = new Map<string, string>();
    if (unique.length === 0) return map;
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,username")
      .in("id", unique);
    for (const p of (data ?? []) as Array<{ id: string; display_name: string | null; username: string | null }>) {
      const name = p.display_name || p.username || "";
      if (name) map.set(p.id, name);
    }
    return map;
  }

  /* ── Load articles ── */

  async function loadArticles(pageNumber: number): Promise<void> {
    if (!clanContext?.clanId) {
      setArticles([]);
      setIsLoading(false);
      setTotalCount(0);
      return;
    }
    setIsLoading(true);
    const fromIndex = (pageNumber - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    let query = supabase
      .from("articles")
      .select("id,title,content,type,is_pinned,status,tags,created_at,created_by", { count: "exact" })
      .eq("clan_id", clanContext.clanId);
    if (tagFilter !== "all") {
      query = query.contains("tags", [tagFilter]);
    }
    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }
    if (searchTerm.trim()) {
      query = query.or(`title.ilike.%${searchTerm.trim()}%,content.ilike.%${searchTerm.trim()}%`);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }
    const { data, error, count } = await query
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);
    setIsLoading(false);
    if (error) {
      pushToast(`Failed to load news: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const authorMap = await resolveAuthorNames(rows.map((r) => String(r.created_by ?? "")));
    setArticles(rows.map((row) => ({
      ...row,
      author_name: authorMap.get(String(row.created_by ?? "")) ?? null,
    })) as ArticleRow[]);
    setTotalCount(count ?? 0);
    /* Auto-clamp page if beyond max */
    if (rows.length === 0 && (count ?? 0) > 0 && pageNumber > 1) {
      const maxPage = Math.max(1, Math.ceil((count ?? 0) / pageSize));
      if (maxPage !== pageNumber) {
        setPage(maxPage);
      }
    }
  }

  useEffect(() => {
    void loadArticles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clanContext?.clanId, tagFilter, typeFilter, searchTerm, dateFrom, dateTo, page, pageSize]);

  /* ── Reload helper ── */

  async function reloadArticles(): Promise<void> {
    await loadArticles(page);
  }

  /* ── Derived data ── */

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    articles.forEach((article) => {
      article.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [articles]);

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
      pushToast(t("selectClanFirst"));
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
      pushToast(t("checkFormValues"));
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      pushToast(t("mustBeLoggedIn"));
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
    const confirmDelete = window.confirm(t("confirmDelete"));
    if (!confirmDelete) return;
    const { error } = await supabase.from("articles").delete().eq("id", articleId);
    if (error) {
      pushToast(`Failed to delete post: ${error.message}`);
      return;
    }
    setArticles((current) => current.filter((item) => item.id !== articleId));
    setTotalCount((current) => Math.max(0, current - 1));
    pushToast(t("postDeleted"));
  }

  /* ── Clear filters ── */

  function handleClearFilters(): void {
    setTagFilter("all");
    setTypeFilter("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasActiveFilters = tagFilter !== "all" || typeFilter !== "all" || searchTerm.trim() !== "" || dateFrom !== "" || dateTo !== "";

  /* ── Pagination helpers ── */

  function handlePageInputChange(nextValue: string): void {
    const nextPage = Number(nextValue);
    if (Number.isNaN(nextPage)) return;
    const clampedPage = Math.min(Math.max(1, nextPage), totalPages);
    setPage(clampedPage);
  }

  return (
    <>
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <SectionHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_chest.png"
      />

      <div className="content-inner">

      {/* ── Action row (create button) ── */}
      {!isFormOpen && canManage && (
        <div style={{ marginBottom: 16 }}>
          <button className="button primary" type="button" onClick={handleOpenCreate}>
            {t("createPost")}
          </button>
        </div>
      )}

      <div className="grid">
        {/* ── Create / Edit Form (collapsible) ── */}
        {isFormOpen && canManage && (
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? t("editPost") : t("createPost")}</div>
                <div className="card-subtitle">{t("visibleToClan")}</div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="newsTitle">Title</label>
                <input
                  id="newsTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newsContent">Content</label>
                <textarea
                  id="newsContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t("contentPlaceholder")}
                  rows={5}
                />
              </div>
              <div className="form-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="newsType">{t("type")}</label>
                  <RadixSelect
                    id="newsType"
                    ariaLabel={t("type")}
                    value={type}
                    onValueChange={(v) => setType(v as "news" | "announcement")}
                    options={[
                      { value: "news", label: t("news") },
                      { value: "announcement", label: t("announcement") },
                    ]}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
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
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="newsTags">{t("tags")}</label>
                  <input
                    id="newsTags"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder={t("tagsPlaceholder")}
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
                  {t("pinLabel")}
                </label>
              </div>
              <div className="list inline" style={{ marginTop: 16 }}>
                <button className="button primary" type="submit" disabled={isSaving}>
                  {isSaving ? t("saving") : editingId ? t("save") : t("createPost")}
                </button>
                <button className="button" type="button" onClick={resetForm}>
                  {t("cancel")}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Pagination Bar (top) ── */}
        <div className="pagination-bar" style={{ gridColumn: "1 / -1" }}>
          <div className="pagination-page-size">
            <label htmlFor="newsPageSize" className="text-muted">
              {t("pageSize")}
            </label>
            <RadixSelect
              id="newsPageSize"
              ariaLabel="Page size"
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
              options={[
                { value: "10", label: "10" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
              ]}
            />
          </div>
          <span className="text-muted">
            {t("showing")} {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, totalCount)} {t("of")} {totalCount}
          </span>
          <div className="pagination-actions">
            <div className="pagination-page-indicator">
              <label htmlFor="newsPageJump" className="text-muted">
                {t("page")}
              </label>
              <input
                id="newsPageJump"
                className="pagination-page-input"
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(event) => handlePageInputChange(event.target.value)}
              />
              <span className="text-muted">/ {totalPages}</span>
            </div>
            <IconButton
              ariaLabel={t("previousPage")}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel={t("nextPage")}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </div>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="alert info loading" style={{ gridColumn: "1 / -1" }}>
            {t("loadingNews")}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && articles.length === 0 && (
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("noNews")}</div>
                <div className="card-subtitle">{t("createPost")}</div>
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
                    {article.type} • {formatLocalDateTime(article.created_at, locale)}
                    {article.author_name && <> • {t("author", { name: article.author_name })}</>}
                  </div>
                </div>
                <div className="list inline" style={{ marginTop: 0, gap: 8 }}>
                  {article.is_pinned && <span className="badge">{t("pinned")}</span>}
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
              {canManage && (
                <div className="list inline" style={{ marginTop: 12 }}>
                  <button className="button" type="button" onClick={() => handleEditArticle(article)}>
                    {t("editPost")}
                  </button>
                  <button className="button danger" type="button" onClick={() => handleDeleteArticle(article.id)}>
                    {t("deletePost")}
                  </button>
                </div>
              )}
            </section>
          ))}

        {/* ── Filters (below articles) ── */}
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{t("filters")}</div>
            </div>
            {hasActiveFilters && (
              <button className="button" type="button" onClick={handleClearFilters} style={{ fontSize: "0.8rem" }}>
                {t("clearFilters")}
              </button>
            )}
          </div>
          <div className="form-grid" style={{ gap: "12px 16px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="newsSearch">{t("search")}</label>
              <SearchInput
                id="newsSearch"
                label=""
                value={searchTerm}
                onChange={(v) => { setSearchTerm(v); setPage(1); }}
                placeholder={t("searchPlaceholder")}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="newsTypeFilter">{t("filterByType")}</label>
              <RadixSelect
                id="newsTypeFilter"
                ariaLabel={t("filterByType")}
                value={typeFilter}
                onValueChange={(v) => { setTypeFilter(v); setPage(1); }}
                options={[
                  { value: "all", label: t("all") },
                  { value: "news", label: t("news") },
                  { value: "announcement", label: t("announcement") },
                ]}
              />
            </div>
            {availableTags.length > 0 && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="newsTagFilter">{t("filterByTag")}</label>
                <RadixSelect
                  id="newsTagFilter"
                  ariaLabel="Tag"
                  value={tagFilter}
                  onValueChange={(v) => { setTagFilter(v); setPage(1); }}
                  options={[
                    { value: "all", label: t("all") },
                    ...availableTags.map((tag) => ({ value: tag, label: tag })),
                  ]}
                />
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t("filterByDate")}</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <DatePicker
                  value={dateFrom}
                  onChange={(v) => { setDateFrom(v); setPage(1); }}
                />
                <span className="text-muted">–</span>
                <DatePicker
                  value={dateTo}
                  onChange={(v) => { setDateTo(v); setPage(1); }}
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
