"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useSearchParams } from "next/navigation";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import useClanContext from "../components/use-clan-context";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useToast } from "../components/toast-provider";
import { computeHotRank, resolveAuthorNames } from "./forum-utils";
import type { ForumPost, ForumComment, SortMode, ViewMode } from "./forum-types";
import { PAGE_SIZE } from "./forum-types";
import type { ForumCategory } from "@/lib/types/domain";

/**
 * Return type for useForum hook. Exposes all state and handlers needed by the forum UI.
 */
export interface UseForumResult {
  /* Core state */
  readonly categories: ForumCategory[];
  readonly posts: ForumPost[];
  readonly comments: ForumComment[];
  readonly selectedCategory: string;
  readonly sortMode: SortMode;
  readonly viewMode: ViewMode;
  readonly selectedPost: ForumPost | null;
  readonly searchTerm: string;
  readonly isLoading: boolean;
  readonly totalCount: number;
  readonly tablesReady: boolean;
  readonly pagination: ReturnType<typeof usePagination>;

  /* Form state (create/edit post) */
  readonly formTitle: string;
  readonly formContent: string;
  readonly formCategoryId: string;
  readonly formPinned: boolean;
  readonly editingPostId: string;
  readonly isPreviewMode: boolean;
  readonly isImageUploading: boolean;
  readonly setFormTitle: Dispatch<SetStateAction<string>>;
  readonly setFormContent: Dispatch<SetStateAction<string>>;
  readonly setFormCategoryId: (v: string) => void;
  readonly setFormPinned: (v: boolean) => void;
  readonly setIsPreviewMode: (v: boolean) => void;
  readonly setIsImageUploading: (v: boolean) => void;

  /* Comment form state */
  readonly commentText: string;
  readonly replyingTo: string;
  readonly setCommentText: Dispatch<SetStateAction<string>>;
  readonly setReplyingTo: (v: string) => void;

  /* Delete confirmation */
  readonly deletingPostId: string;
  readonly setDeletingPostId: (v: string) => void;

  /* Refs */
  readonly detailRef: RefObject<HTMLElement | null>;
  readonly contentTextareaRef: RefObject<HTMLTextAreaElement | null>;

  /* Permissions & auth */
  readonly canManage: boolean;
  readonly currentUserId: string;
  readonly supabase: ReturnType<typeof useSupabase>;

  /* List view setters (for toolbar) */
  readonly setSortMode: (mode: SortMode) => void;
  readonly setSearchTerm: (v: string) => void;

  /* Handlers */
  readonly loadPosts: () => Promise<void>;
  readonly handleOpenPost: (post: ForumPost) => void;
  readonly handleVotePost: (postId: string, voteType: number) => Promise<void>;
  readonly handleVoteComment: (commentId: string, voteType: number) => Promise<void>;
  readonly handleOpenCreate: () => void;
  readonly handleEditPost: (post: ForumPost) => void;
  readonly handleSubmitPost: () => Promise<void>;
  readonly resetForm: () => void;
  readonly handleConfirmDelete: () => Promise<void>;
  readonly handleTogglePin: (post: ForumPost) => Promise<void>;
  readonly handleToggleLock: (post: ForumPost) => Promise<void>;
  readonly handleSubmitComment: () => Promise<void>;
  readonly handleSubmitReply: () => Promise<void>;
  readonly handleEditComment: (commentId: string, newContent: string) => Promise<void>;
  readonly handleDeleteComment: (commentId: string) => Promise<void>;
  readonly handleBackToList: () => void;
  readonly resetFormAndSetList: () => void;
}

/**
 * Custom hook that manages all forum state, data loading, voting, and post/comment CRUD.
 * Returns state and handlers for the forum UI orchestrator.
 */
export function useForum(t: (key: string) => string): UseForumResult {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const searchParams = useSearchParams();
  const urlCategorySlug = searchParams.get("category") ?? "";
  const urlPostId = searchParams.get("post") ?? "";

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
  const [totalCount, setTotalCount] = useState<number>(0);
  const [tablesReady, setTablesReady] = useState<boolean>(true);

  const pagination = usePagination(totalCount, PAGE_SIZE);

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
  const [replyingTo, setReplyingTo] = useState<string>("");

  /* Delete confirmation */
  const [deletingPostId, setDeletingPostId] = useState<string>("");

  const detailRef = useRef<HTMLElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const categoriesRef = useRef<ForumCategory[]>([]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const { isContentManager: canManage } = useUserRole(supabase);
  const { userId: authUserId } = useAuth();
  const currentUserId = authUserId ?? "";

  /** Stable category lookup map (id → { name, slug }). */
  const catMap = useMemo(() => {
    const map: Record<string, { name: string; slug: string }> = {};
    for (const cat of categories) {
      map[cat.id] = { name: cat.name, slug: cat.slug };
    }
    return map;
  }, [categories]);

  /* ─── Load categories ─── */
  useEffect(() => {
    async function loadCategories(): Promise<void> {
      if (!clanContext) return;
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("clan_id", clanContext.clanId)
        .order("name", { ascending: true });
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
    query = query.order("is_pinned", { ascending: false });
    if (sortMode === "new") {
      query = query.order("created_at", { ascending: false });
    } else if (sortMode === "top") {
      query = query.order("score", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }
    const fromIdx = pagination.startIndex;
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
    const authorIds = rawPosts.map((p) => p.author_id);
    const nameMap = await resolveAuthorNames(supabase, authorIds);
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
    if (sortMode === "hot") {
      enriched.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return computeHotRank(b.score, b.created_at) - computeHotRank(a.score, a.created_at);
      });
    }
    setPosts(enriched);
    setIsLoading(false);
  }, [
    supabase,
    clanContext,
    selectedCategory,
    sortMode,
    searchTerm,
    pagination.startIndex,
    currentUserId,
    tablesReady,
    catMap,
  ]);

  useEffect(() => {
    if (clanContext && categories.length > 0) {
      void loadPosts();
    }
  }, [loadPosts, clanContext, categories]);

  /* ─── Load comments ─── */
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
          byId[c.parent_comment_id]!.replies!.push(c);
        } else {
          topLevel.push(c);
        }
      }
      setComments(topLevel);
    },
    [supabase, currentUserId, tablesReady],
  );

  /* ─── Deep-link: open post from ?post= query param ─── */
  useEffect(() => {
    if (!urlPostId || !clanContext || !tablesReady) return;
    if (viewMode === "detail" && selectedPost?.id === urlPostId) return;
    let cancelled = false;
    async function openLinkedPost(): Promise<void> {
      const { data, error } = await supabase.from("forum_posts").select("*").eq("id", urlPostId).maybeSingle();
      if (cancelled || error || !data) return;
      const raw = data as ForumPost;
      const nameMap = await resolveAuthorNames(supabase, [raw.author_id]);
      if (cancelled) return;
      let userVote = 0;
      if (currentUserId) {
        const { data: votes } = await supabase
          .from("forum_votes")
          .select("vote_type")
          .eq("post_id", raw.id)
          .eq("user_id", currentUserId)
          .maybeSingle();
        if (cancelled) return;
        userVote = (votes?.vote_type as number) ?? 0;
      }
      const enriched: ForumPost = {
        ...raw,
        authorName: nameMap[raw.author_id] ?? "Unknown",
        categoryName: raw.category_id ? (catMap[raw.category_id]?.name ?? "") : "",
        categorySlug: raw.category_id ? (catMap[raw.category_id]?.slug ?? "") : "",
        userVote,
      };
      setSelectedPost(enriched);
      setViewMode("detail");
      setCommentText("");
      setReplyingTo("");
      void loadComments(enriched.id);
    }
    void openLinkedPost();
    return () => {
      cancelled = true;
    };
  }, [
    urlPostId,
    clanContext,
    tablesReady,
    categories,
    supabase,
    currentUserId,
    loadComments,
    catMap,
    viewMode,
    selectedPost?.id,
  ]);

  /* ─── Voting ─── */
  const handleVotePost = useCallback(
    async (postId: string, voteType: number): Promise<void> => {
      if (!currentUserId) return;
      const post = posts.find((p) => p.id === postId);
      if (!post) return;
      const currentVote = post.userVote ?? 0;
      let newVote = voteType;
      if (currentVote === voteType) {
        newVote = 0;
        const { error } = await supabase
          .from("forum_votes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId);
        if (error) {
          pushToast(t("voteFailed"));
          return;
        }
      } else {
        const { error } = await supabase
          .from("forum_votes")
          .upsert({ post_id: postId, user_id: currentUserId, vote_type: voteType }, { onConflict: "post_id,user_id" });
        if (error) {
          pushToast(t("voteFailed"));
          return;
        }
      }
      const scoreDelta = newVote - currentVote;
      const newScore = post.score + scoreDelta;
      const { error: scoreError } = await supabase.from("forum_posts").update({ score: newScore }).eq("id", postId);
      if (scoreError) {
        pushToast(t("voteFailed"));
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, score: newScore, userVote: newVote } : p)));
      setSelectedPost((prev) => (prev?.id === postId ? { ...prev, score: newScore, userVote: newVote } : prev));
    },
    [supabase, currentUserId, posts, pushToast, t],
  );

  const handleVoteComment = useCallback(
    async (commentId: string, voteType: number): Promise<void> => {
      if (!currentUserId) return;
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
        const { error } = await supabase
          .from("forum_comment_votes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);
        if (error) {
          pushToast(t("voteFailed"));
          return;
        }
      } else {
        const { error } = await supabase
          .from("forum_comment_votes")
          .upsert(
            { comment_id: commentId, user_id: currentUserId, vote_type: voteType },
            { onConflict: "comment_id,user_id" },
          );
        if (error) {
          pushToast(t("voteFailed"));
          return;
        }
      }
      const scoreDelta = newVote - currentVote;
      const newScore = comment.score + scoreDelta;
      const { error: scoreError } = await supabase
        .from("forum_comments")
        .update({ score: newScore })
        .eq("id", commentId);
      if (scoreError) {
        pushToast(t("voteFailed"));
        return;
      }
      function updateTree(list: ForumComment[]): ForumComment[] {
        return list.map((c) => {
          if (c.id === commentId) return { ...c, score: newScore, userVote: newVote };
          return { ...c, replies: updateTree(c.replies ?? []) };
        });
      }
      setComments((prev) => updateTree(prev));
    },
    [supabase, currentUserId, comments, pushToast, t],
  );

  /* ─── Form helpers ─── */
  const resetForm = useCallback((): void => {
    setFormTitle("");
    setFormContent("");
    setFormCategoryId("");
    setFormPinned(false);
    setEditingPostId("");
  }, []);

  /* ─── Create / Edit Post ─── */
  const handleSubmitPost = useCallback(async (): Promise<void> => {
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
      const { error: updateError } = await supabase.from("forum_posts").update(updatePayload).eq("id", editingPostId);
      if (updateError) {
        pushToast(t("saveFailed"));
        return;
      }
      const savedId = editingPostId;
      resetForm();
      if (selectedPost) {
        const updatedPost: ForumPost = {
          ...selectedPost,
          title: updatePayload.title as string,
          content: (updatePayload.content as string) ?? "",
          category_id: (updatePayload.category_id as string) ?? selectedPost.category_id,
          categoryName: updatePayload.category_id
            ? (catMap[updatePayload.category_id as string]?.name ?? selectedPost.categoryName)
            : selectedPost.categoryName,
          categorySlug: updatePayload.category_id
            ? (catMap[updatePayload.category_id as string]?.slug ?? selectedPost.categorySlug)
            : selectedPost.categorySlug,
          is_pinned: (updatePayload.is_pinned as boolean) ?? selectedPost.is_pinned,
          updated_at: updatePayload.updated_at as string,
        };
        setSelectedPost(updatedPost);
        setViewMode("detail");
        void loadComments(savedId);
      }
      void loadPosts();
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
      const { error: insertError } = await supabase.from("forum_posts").insert(insertPayload);
      if (insertError) {
        pushToast(t("saveFailed"));
        return;
      }
      resetForm();
      setViewMode("list");
      pagination.setPage(1);
      void loadPosts();
    }
  }, [
    clanContext,
    currentUserId,
    formTitle,
    formContent,
    formCategoryId,
    formPinned,
    editingPostId,
    canManage,
    selectedPost,
    catMap,
    supabase,
    pushToast,
    t,
    pagination,
    loadPosts,
    loadComments,
    resetForm,
  ]);

  const handleOpenCreate = useCallback((): void => {
    resetForm();
    setViewMode("create");
  }, [resetForm]);

  const handleEditPost = useCallback((post: ForumPost): void => {
    setFormTitle(post.title);
    setFormContent(post.content ?? "");
    setFormCategoryId(post.category_id ?? "");
    setFormPinned(post.is_pinned);
    setEditingPostId(post.id);
    setViewMode("create");
  }, []);

  /* ─── Delete Post ─── */
  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!deletingPostId) return;
    const { error } = await supabase.from("forum_posts").delete().eq("id", deletingPostId);
    if (error) {
      pushToast(t("deleteFailed"));
      setDeletingPostId("");
      return;
    }
    setDeletingPostId("");
    if (viewMode === "detail") {
      setViewMode("list");
      setSelectedPost(null);
    }
    void loadPosts();
  }, [deletingPostId, viewMode, supabase, pushToast, t, loadPosts]);

  /* ─── Pin / Lock ─── */
  const handleTogglePin = useCallback(
    async (post: ForumPost): Promise<void> => {
      const { error } = await supabase.from("forum_posts").update({ is_pinned: !post.is_pinned }).eq("id", post.id);
      if (error) {
        pushToast(t("saveFailed"));
        return;
      }
      void loadPosts();
      setSelectedPost((prev) => (prev?.id === post.id ? { ...prev, is_pinned: !prev.is_pinned } : prev));
    },
    [supabase, pushToast, t, loadPosts],
  );

  const handleToggleLock = useCallback(
    async (post: ForumPost): Promise<void> => {
      const { error } = await supabase.from("forum_posts").update({ is_locked: !post.is_locked }).eq("id", post.id);
      if (error) {
        pushToast(t("saveFailed"));
        return;
      }
      void loadPosts();
      setSelectedPost((prev) => (prev?.id === post.id ? { ...prev, is_locked: !prev.is_locked } : prev));
    },
    [supabase, pushToast, t, loadPosts],
  );

  /* ─── Open Post Detail ─── */
  const handleOpenPost = useCallback(
    (post: ForumPost): void => {
      setSelectedPost(post);
      setViewMode("detail");
      setCommentText("");
      setReplyingTo("");
      void loadComments(post.id);
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },
    [loadComments],
  );

  const refreshCommentCount = useCallback(async (): Promise<void> => {
    if (!selectedPost) return;
    const { data } = await supabase.from("forum_posts").select("comment_count").eq("id", selectedPost.id).maybeSingle();
    const count = (data?.comment_count as number) ?? 0;
    setSelectedPost((prev) => (prev ? { ...prev, comment_count: count } : prev));
  }, [selectedPost, supabase]);

  /* ─── Submit Comment ─── */
  const handleSubmitComment = useCallback(async (): Promise<void> => {
    if (!currentUserId || !selectedPost || !commentText.trim()) return;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: selectedPost.id,
      author_id: currentUserId,
      content: commentText.trim(),
    });
    if (error) {
      pushToast(t("saveFailed"));
      return;
    }
    setCommentText("");
    setReplyingTo("");
    await refreshCommentCount();
    void loadComments(selectedPost.id);
  }, [currentUserId, selectedPost, commentText, supabase, pushToast, t, refreshCommentCount, loadComments]);

  const handleSubmitReply = useCallback(async (): Promise<void> => {
    if (!currentUserId || !selectedPost || !commentText.trim() || !replyingTo) return;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: selectedPost.id,
      parent_comment_id: replyingTo,
      author_id: currentUserId,
      content: commentText.trim(),
    });
    if (error) {
      pushToast(t("saveFailed"));
      return;
    }
    setCommentText("");
    setReplyingTo("");
    await refreshCommentCount();
    void loadComments(selectedPost.id);
  }, [currentUserId, selectedPost, commentText, replyingTo, supabase, pushToast, t, refreshCommentCount, loadComments]);

  /* ─── Edit Comment ─── */
  const handleEditComment = useCallback(
    async (commentId: string, newContent: string): Promise<void> => {
      if (!selectedPost) return;
      const { error } = await supabase
        .from("forum_comments")
        .update({ content: newContent, updated_at: new Date().toISOString() })
        .eq("id", commentId);
      if (!error) {
        void loadComments(selectedPost.id);
      }
    },
    [selectedPost, supabase, loadComments],
  );

  /* ─── Delete Comment ─── */
  const handleDeleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      if (!selectedPost) return;
      const { error } = await supabase.from("forum_comments").delete().eq("id", commentId);
      if (error) {
        pushToast(t("deleteCommentFailed"));
        return;
      }
      await refreshCommentCount();
      void loadComments(selectedPost.id);
    },
    [selectedPost, supabase, pushToast, t, refreshCommentCount, loadComments],
  );

  /* ─── Navigate back to list ─── */
  const handleBackToList = useCallback((): void => {
    setViewMode("list");
    setSelectedPost(null);
    void loadPosts();
  }, [loadPosts]);

  const resetFormAndSetList = useCallback((): void => {
    resetForm();
    setViewMode("list");
  }, [resetForm]);

  return {
    categories,
    posts,
    comments,
    selectedCategory,
    sortMode,
    viewMode,
    selectedPost,
    searchTerm,
    isLoading,
    totalCount,
    tablesReady,
    pagination,
    formTitle,
    formContent,
    formCategoryId,
    formPinned,
    editingPostId,
    isPreviewMode,
    isImageUploading,
    setFormTitle,
    setFormContent,
    setFormCategoryId,
    setFormPinned,
    setIsPreviewMode,
    setIsImageUploading,
    commentText,
    replyingTo,
    setCommentText,
    setReplyingTo,
    deletingPostId,
    setDeletingPostId,
    detailRef,
    contentTextareaRef,
    canManage,
    currentUserId,
    supabase,
    setSortMode,
    setSearchTerm,
    loadPosts,
    handleOpenPost,
    handleVotePost,
    handleVoteComment,
    handleOpenCreate,
    handleEditPost,
    handleSubmitPost,
    resetForm,
    handleConfirmDelete,
    handleTogglePin,
    handleToggleLock,
    handleSubmitComment,
    handleSubmitReply,
    handleEditComment,
    handleDeleteComment,
    handleBackToList,
    resetFormAndSetList,
  };
}
