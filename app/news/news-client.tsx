"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import { formatLocalDateTime } from "../../lib/date-format";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";
import IconButton from "../components/ui/icon-button";
import DatePicker from "../components/date-picker";
import SearchInput from "../components/ui/search-input";
import dynamic from "next/dynamic";
import SectionHero from "../components/section-hero";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-32 rounded" />,
});
import AppMarkdownToolbar, { handleImagePaste, handleImageDrop } from "@/lib/markdown/app-markdown-toolbar";

/* ─── Banner templates ─── */

const BANNER_TEMPLATES: readonly { readonly src: string; readonly label: string }[] = [
  { src: "/assets/banners/banner_gold_dragon.png", label: "Gold Dragon" },
  { src: "/assets/banners/banner_chest.png", label: "Chest" },
  { src: "/assets/banners/banner_captain.png", label: "Captain" },
  { src: "/assets/banners/banner_doomsday_708.png", label: "Doomsday" },
  { src: "/assets/banners/banner_ragnarok_clan_event_708x123.png", label: "Ragnarok" },
  { src: "/assets/banners/banner_tournir_kvk.png", label: "KvK Turnier" },
];

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
  const supabase = createSupabaseBrowserClient();
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
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const totalPages: number = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Filter state ── */
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  /* ── Form state ── */
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "pending" | "published">("published");
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [tagsInput, setTagsInput] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [isBannerUploading, setIsBannerUploading] = useState<boolean>(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  /* ── Expanded article detail ── */
  const [expandedArticleId, setExpandedArticleId] = useState<string>("");

  const tags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [tagsInput]);

  /** Extract a display name from a PostgREST profile join result. */
  function extractName(profile: { display_name: string | null; username: string | null } | null): string | null {
    if (!profile) return null;
    return profile.display_name || profile.username || null;
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
    /* Select with embedded profile joins for author + editor names */
    const selectCols =
      "id,title,content,type,is_pinned,status,tags,created_at,updated_at,created_by,banner_url,updated_by," +
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
        author_name: extractName(row.author as { display_name: string | null; username: string | null } | null),
        editor_name: extractName(row.editor as { display_name: string | null; username: string | null } | null),
      })) as ArticleRow[],
    );
    setTotalCount(count ?? 0);
    if (rows.length === 0 && (count ?? 0) > 0 && pageNumber > 1) {
      const maxPage = Math.max(1, Math.ceil((count ?? 0) / pageSize));
      if (maxPage !== pageNumber) setPage(maxPage);
    }
  }

  useEffect(() => {
    void loadArticles(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clanContext?.clanId, tagFilter, searchTerm, dateFrom, dateTo, page, pageSize]);

  async function reloadArticles(): Promise<void> {
    await loadArticles(page);
  }

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
    setIsPreviewMode(false);
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
    setIsPreviewMode(false);
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
    }
    pushToast(editingId ? t("postUpdated") : t("postCreated"));
    resetForm();
    await reloadArticles();
  }

  /* ── Delete ── */
  async function handleDeleteArticle(articleId: string): Promise<void> {
    if (!window.confirm(t("confirmDelete"))) return;
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
    setPage(1);
  }
  const hasActiveFilters = tagFilter !== "all" || searchTerm.trim() !== "" || dateFrom !== "" || dateTo !== "";

  function handlePageInputChange(v: string): void {
    const n = Number(v);
    if (Number.isNaN(n)) return;
    setPage(Math.min(Math.max(1, n), totalPages));
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
          {/* ═══ Create / Edit Form ═══ */}
          {isFormOpen && canManage && (
            <section className="card col-span-full">
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
                  <div className="news-banner-picker" role="group" aria-labelledby="newsBannerLabel">
                    {/* No banner option */}
                    <button
                      type="button"
                      className={`news-banner-option flex items-center justify-center text-xs text-text-muted min-h-12${bannerUrl === "" ? " selected" : ""}`}
                      onClick={() => setBannerUrl("")}
                    >
                      {t("noBanner")}
                    </button>
                    {/* Templates */}
                    {BANNER_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.src}
                        type="button"
                        className={`news-banner-option${bannerUrl === tmpl.src ? " selected" : ""}`}
                        onClick={() => setBannerUrl(tmpl.src)}
                      >
                        <Image src={tmpl.src} alt={tmpl.label} width={80} height={48} />
                      </button>
                    ))}
                    {/* Custom upload */}
                    <button
                      type="button"
                      className={`news-banner-option news-banner-upload flex flex-col items-center justify-center gap-1${bannerUrl && !BANNER_TEMPLATES.some((t) => t.src === bannerUrl) && bannerUrl !== "" ? " selected" : ""}`}
                      onClick={() => bannerFileRef.current?.click()}
                    >
                      {bannerUrl && !BANNER_TEMPLATES.some((tmpl) => tmpl.src === bannerUrl) && bannerUrl !== "" ? (
                        <img src={bannerUrl} alt="Custom" className="w-full h-full object-cover rounded-sm" />
                      ) : (
                        <>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                          <span className="text-[0.65rem]">{t("customBanner")}</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={bannerFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerUpload}
                    />
                  </div>
                  {isBannerUploading && (
                    <p className="mt-1" style={{ fontSize: "0.75rem", color: "var(--color-gold)" }}>
                      {t("uploadingImage")}
                    </p>
                  )}
                </div>

                {/* Content editor */}
                <div className="form-group">
                  <label htmlFor="newsContent">{t("contentLabel")}</label>
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
                    <div className="forum-editor-preview p-4" style={{ minHeight: 250 }}>
                      {content.trim() ? (
                        <AppMarkdown content={content} />
                      ) : (
                        <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("previewEmpty")}</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <AppMarkdownToolbar
                        textareaRef={contentTextareaRef}
                        value={content}
                        onChange={setContent}
                        supabase={supabase}
                        userId={currentUserId}
                      />
                      <textarea
                        id="newsContent"
                        ref={contentTextareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={t("contentPlaceholder")}
                        rows={14}
                        className="text-[0.88rem] leading-relaxed"
                        style={{ minHeight: 250, fontFamily: "var(--font-body)" }}
                        onPaste={(e) =>
                          handleImagePaste(
                            e,
                            supabase,
                            currentUserId,
                            (md) => setContent((p) => p + md),
                            setIsImageUploading,
                          )
                        }
                        onDrop={(e) =>
                          handleImageDrop(
                            e,
                            supabase,
                            currentUserId,
                            (md) => setContent((p) => p + md),
                            setIsImageUploading,
                          )
                        }
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />
                      <p className="mt-1 text-[0.72rem] text-text-muted">{t("markdownHint")}</p>
                    </>
                  )}
                  {isImageUploading && <p className="text-[0.78rem] text-gold">{t("uploadingImage")}</p>}
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
          )}

          {/* ═══ Pagination ═══ */}
          <div className="pagination-bar col-span-full">
            <div className="pagination-page-size">
              <label htmlFor="newsPageSize" className="text-muted">
                {t("pageSize")}
              </label>
              <RadixSelect
                id="newsPageSize"
                ariaLabel={t("pageSize")}
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
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
              {t("showing")} {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}{" "}
              {t("of")} {totalCount}
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
                  onChange={(e) => handlePageInputChange(e.target.value)}
                />
                <span className="text-muted">/ {totalPages}</span>
              </div>
              <IconButton
                ariaLabel={t("previousPage")}
                onClick={() => setPage((c) => Math.max(1, c - 1))}
                disabled={page === 1}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10 3L6 8L10 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel={t("nextPage")}
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                disabled={page >= totalPages}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6 3L10 8L6 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            </div>
          </div>

          {/* Loading / Empty */}
          {isLoading && <div className="alert info loading col-span-full">{t("loadingNews")}</div>}
          {!isLoading && articles.length === 0 && (
            <section className="card col-span-full">
              <div className="card-header">
                <div>
                  <div className="card-title">{t("noNews")}</div>
                </div>
              </div>
            </section>
          )}

          {/* ═══ Article Cards ═══ */}
          {!isLoading &&
            articles.map((article) => {
              const isExpanded = expandedArticleId === article.id;
              return (
                <article key={article.id} className="news-card col-span-full">
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
                  {canManage && (
                    <div className="news-card-actions">
                      <button className="button" type="button" onClick={() => handleEditArticle(article)}>
                        {t("editPost")}
                      </button>
                      <button className="button danger" type="button" onClick={() => handleDeleteArticle(article.id)}>
                        {t("deletePost")}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}

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
                    setPage(1);
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
                      setPage(1);
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
                      setPage(1);
                    }}
                  />
                  <span className="text-muted">–</span>
                  <DatePicker
                    value={dateTo}
                    onChange={(v) => {
                      setDateTo(v);
                      setPage(1);
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
