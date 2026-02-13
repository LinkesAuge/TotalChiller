"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import { extractAuthorName } from "@/lib/dashboard-utils";
import useClanContext from "../hooks/use-clan-context";
import { useToast } from "../components/toast-provider";
import { usePagination } from "@/lib/hooks/use-pagination";
import { createLinkedForumPost } from "@/lib/forum-thread-sync";
import { FORUM_IMAGES_BUCKET } from "@/lib/constants";
import { z } from "zod";
import type { NewsFormValues } from "./news-form";

/* ─── Types ─── */

export interface ArticleRow {
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

/**
 * Return type for useNews hook. Exposes all state and handlers needed by the news UI.
 */
export interface UseNewsResult {
  /* Core state */
  readonly articles: readonly ArticleRow[];
  readonly isLoading: boolean;
  readonly totalCount: number;
  readonly pagination: ReturnType<typeof usePagination>;

  /* Filter state */
  readonly isFiltersOpen: boolean;
  readonly setIsFiltersOpen: Dispatch<SetStateAction<boolean>>;
  readonly tagFilter: string;
  readonly searchTerm: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly availableTags: readonly string[];
  readonly hasActiveFilters: boolean;

  /* Form state */
  readonly editFormRef: RefObject<HTMLElement | null>;
  readonly isFormOpen: boolean;
  readonly isSaving: boolean;
  readonly editingId: string;
  readonly formValues: NewsFormValues;
  readonly isBannerUploading: boolean;
  readonly bannerFileRef: RefObject<HTMLInputElement | null>;

  /* Expanded article */
  readonly expandedArticleId: string;
  readonly setExpandedArticleId: Dispatch<SetStateAction<string>>;

  /* Delete confirmation */
  readonly deletingArticleId: string;
  readonly setDeletingArticleId: Dispatch<SetStateAction<string>>;

  /* Permissions & auth */
  readonly canManage: boolean;
  readonly currentUserId: string;
  readonly supabase: ReturnType<typeof useSupabase>;

  /* Handlers */
  readonly loadArticles: () => Promise<void>;
  readonly handleOpenCreate: () => void;
  readonly handleEditArticle: (article: ArticleRow) => void;
  readonly handleFieldChange: (field: keyof NewsFormValues, value: string | boolean) => void;
  readonly handleBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly resetForm: () => void;
  readonly handleConfirmDeleteArticle: () => Promise<void>;
  readonly handleClearFilters: () => void;
  readonly handleSearchTermChange: (value: string) => void;
  readonly handleTagFilterChange: (value: string) => void;
  readonly handleDateFromChange: (value: string) => void;
  readonly handleDateToChange: (value: string) => void;
}

/**
 * Custom hook that manages all news state, data loading, and article CRUD.
 * Returns state and handlers for the news UI orchestrator.
 */
export function useNews(t: (key: string) => string): UseNewsResult {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { pushToast } = useToast();

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
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
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

  /* ── Delete confirmation ── */
  const [deletingArticleId, setDeletingArticleId] = useState<string>("");

  /* ── Available tags ── */
  const [availableTags, setAvailableTags] = useState<readonly string[]>([]);

  const tags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [tagsInput]);

  const formValues: NewsFormValues = useMemo(
    () => ({ title, content, status, isPinned, tagsInput, bannerUrl }),
    [title, content, status, isPinned, tagsInput, bannerUrl],
  );

  const hasActiveFilters = tagFilter !== "all" || searchTerm.trim() !== "" || dateFrom !== "" || dateTo !== "";

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

  /* Load all distinct tags for the clan */
  useEffect(() => {
    if (!clanContext?.clanId) return;
    let cancelled = false;
    async function loadTags(): Promise<void> {
      const { data } = await supabase.from("articles").select("tags").eq("clan_id", clanContext!.clanId);
      if (cancelled || !data) return;
      const tagSet = new Set<string>();
      for (const row of data as Array<{ tags: string[] }>) {
        for (const tag of row.tags ?? []) tagSet.add(tag);
      }
      setAvailableTags(Array.from(tagSet).sort());
    }
    void loadTags();
    return () => {
      cancelled = true;
    };
  }, [clanContext, supabase]);

  /* ── Form helpers ── */
  const resetForm = useCallback((): void => {
    setTitle("");
    setContent("");
    setStatus("published");
    setIsPinned(false);
    setTagsInput("");
    setBannerUrl("");
    setEditingId("");
    setIsFormOpen(false);
  }, []);

  const handleOpenCreate = useCallback((): void => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const handleEditArticle = useCallback((article: ArticleRow): void => {
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
  }, []);

  const handleBannerUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = e.target.files?.[0];
      if (!file || !currentUserId) return;
      setIsBannerUploading(true);
      const path = `${currentUserId}/${Date.now()}_banner_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage.from(FORUM_IMAGES_BUCKET).upload(path, file);
      setIsBannerUploading(false);
      if (uploadErr) {
        pushToast(`${t("saveError")}: ${uploadErr.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from(FORUM_IMAGES_BUCKET).getPublicUrl(path);
      setBannerUrl(urlData.publicUrl);
    },
    [currentUserId, supabase, pushToast, t],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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
      const payload = isNewPost ? { ...sharedFields, created_by: userId } : { ...sharedFields, updated_by: userId };
      setIsSaving(true);
      let { data: insertedData, error } = editingId
        ? await supabase.from("articles").update(payload).eq("id", editingId).select("id").maybeSingle()
        : await supabase.from("articles").insert(payload).select("id").single();
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
        const { forumPostId, error: forumError } = await createLinkedForumPost(supabase, {
          clanId: clanContext.clanId,
          authorId: userId,
          title: parsed.data.title,
          content: parsed.data.content,
          sourceType: "announcement",
          sourceId: insertedData.id as string,
          categorySlug: "announcements",
        });
        if (forumError) {
          pushToast(t("forumThreadFailed"));
        } else if (forumPostId) {
          await supabase
            .from("articles")
            .update({ forum_post_id: forumPostId })
            .eq("id", insertedData.id as string);
        }
      }
      pushToast(editingId ? t("postUpdated") : t("postCreated"));
      resetForm();
      await loadArticles();
    },
    [
      clanContext,
      title,
      content,
      status,
      isPinned,
      tags,
      bannerUrl,
      editingId,
      supabase,
      pushToast,
      t,
      resetForm,
      loadArticles,
    ],
  );

  const handleConfirmDeleteArticle = useCallback(async (): Promise<void> => {
    if (!deletingArticleId) return;
    const { error } = await supabase.from("articles").delete().eq("id", deletingArticleId);
    if (error) {
      pushToast(`${t("deleteError")}: ${error.message}`);
      setDeletingArticleId("");
      return;
    }
    setArticles((c) => c.filter((a) => a.id !== deletingArticleId));
    setTotalCount((c) => Math.max(0, c - 1));
    setDeletingArticleId("");
    pushToast(t("postDeleted"));
  }, [deletingArticleId, supabase, pushToast, t]);

  const handleClearFilters = useCallback((): void => {
    setTagFilter("all");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    pagination.setPage(1);
  }, [pagination]);

  const handleSearchTermChange = useCallback(
    (value: string): void => {
      setSearchTerm(value);
      pagination.setPage(1);
    },
    [pagination],
  );

  const handleTagFilterChange = useCallback(
    (value: string): void => {
      setTagFilter(value);
      pagination.setPage(1);
    },
    [pagination],
  );

  const handleDateFromChange = useCallback(
    (value: string): void => {
      setDateFrom(value);
      pagination.setPage(1);
    },
    [pagination],
  );

  const handleDateToChange = useCallback(
    (value: string): void => {
      setDateTo(value);
      pagination.setPage(1);
    },
    [pagination],
  );

  const handleFieldChange = useCallback((field: keyof NewsFormValues, value: string | boolean): void => {
    const setters: Record<keyof NewsFormValues, (v: never) => void> = {
      title: setTitle as (v: never) => void,
      content: setContent as (v: never) => void,
      status: setStatus as (v: never) => void,
      isPinned: setIsPinned as (v: never) => void,
      tagsInput: setTagsInput as (v: never) => void,
      bannerUrl: setBannerUrl as (v: never) => void,
    };
    setters[field](value as never);
  }, []);

  return {
    articles,
    isLoading,
    totalCount,
    pagination,
    isFiltersOpen,
    setIsFiltersOpen,
    tagFilter,
    searchTerm,
    dateFrom,
    dateTo,
    availableTags,
    hasActiveFilters,
    editFormRef,
    isFormOpen,
    isSaving,
    editingId,
    formValues,
    isBannerUploading,
    bannerFileRef,
    expandedArticleId,
    setExpandedArticleId,
    deletingArticleId,
    setDeletingArticleId,
    canManage,
    currentUserId,
    supabase,
    loadArticles,
    handleOpenCreate,
    handleEditArticle,
    handleFieldChange,
    handleBannerUpload,
    handleSubmit,
    resetForm,
    handleConfirmDeleteArticle,
    handleClearFilters,
    handleSearchTermChange,
    handleTagFilterChange,
    handleDateFromChange,
    handleDateToChange,
  };
}
