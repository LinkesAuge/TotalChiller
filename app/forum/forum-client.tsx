"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";
import ForumPostForm from "./forum-post-form";
import ForumPostDetail from "./forum-post-detail";
import ForumPostList from "./forum-post-list";
import { computeHotRank, resolveAuthorNames } from "./forum-utils";
import type { ForumPost, ForumComment, SortMode, ViewMode } from "./forum-types";
import { PAGE_SIZE } from "./forum-types";
import type { ForumCategory } from "@/lib/types/domain";
import { usePagination } from "@/lib/hooks/use-pagination";

function ForumClient(): JSX.Element {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const t = useTranslations("forum");
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const pagination = usePagination(totalCount, PAGE_SIZE);
  const [tablesReady, setTablesReady] = useState<boolean>(true);

  /* Create/edit form */
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formPinned, setFormPinned] = useState<boolean>(false);
  const [editingPostId, setEditingPostId] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);

  /* Comment form (unified: top-level comments and replies share one text field) */
  const [commentText, setCommentText] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<string>("");

  /* Delete confirmation */
  const [deletingPostId, setDeletingPostId] = useState<string>("");

  const detailRef = useRef<HTMLElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

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
    const catMap: Record<string, { name: string; slug: string }> = {};
    for (const cat of categories) {
      catMap[cat.id] = { name: cat.name, slug: cat.slug };
    }
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
    pagination.page,
    categories,
    currentUserId,
    tablesReady,
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
    async function openLinkedPost(): Promise<void> {
      const { data, error } = await supabase.from("forum_posts").select("*").eq("id", urlPostId).maybeSingle();
      if (error || !data) return;
      const raw = data as ForumPost;
      const nameMap = await resolveAuthorNames(supabase, [raw.author_id]);
      const catMap: Record<string, { name: string; slug: string }> = {};
      for (const cat of categories) {
        catMap[cat.id] = { name: cat.name, slug: cat.slug };
      }
      let userVote = 0;
      if (currentUserId) {
        const { data: votes } = await supabase
          .from("forum_votes")
          .select("vote_type")
          .eq("post_id", raw.id)
          .eq("user_id", currentUserId)
          .maybeSingle();
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
  }, [urlPostId, clanContext, tablesReady, categories, supabase, currentUserId, loadComments]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Voting ─── */
  async function handleVotePost(postId: string, voteType: number): Promise<void> {
    if (!currentUserId) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const currentVote = post.userVote ?? 0;
    let newVote = voteType;
    if (currentVote === voteType) {
      newVote = 0;
      await supabase.from("forum_votes").delete().eq("post_id", postId).eq("user_id", currentUserId);
    } else {
      await supabase
        .from("forum_votes")
        .upsert({ post_id: postId, user_id: currentUserId, vote_type: voteType }, { onConflict: "post_id,user_id" });
    }
    const scoreDelta = newVote - currentVote;
    const newScore = post.score + scoreDelta;
    await supabase.from("forum_posts").update({ score: newScore }).eq("id", postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, score: newScore, userVote: newVote } : p)));
    if (selectedPost?.id === postId) {
      setSelectedPost((prev) => (prev ? { ...prev, score: newScore, userVote: newVote } : prev));
    }
  }

  async function handleVoteComment(commentId: string, voteType: number): Promise<void> {
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
      /* Stay in detail view with refreshed data */
      const savedId = editingPostId;
      resetForm();
      if (selectedPost) {
        const catMap: Record<string, { name: string; slug: string }> = {};
        for (const cat of categories) {
          catMap[cat.id] = { name: cat.name, slug: cat.slug };
        }
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
      await supabase.from("forum_posts").insert(insertPayload);
      resetForm();
      setViewMode("list");
      pagination.setPage(1);
      void loadPosts();
    }
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

  async function handleSubmitReply(): Promise<void> {
    if (!currentUserId || !selectedPost || !commentText.trim() || !replyingTo) return;
    const { error } = await supabase.from("forum_comments").insert({
      post_id: selectedPost.id,
      parent_comment_id: replyingTo,
      author_id: currentUserId,
      content: commentText.trim(),
    });
    if (!error) {
      setCommentText("");
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

  /* ─── Edit Comment ─── */
  async function handleEditComment(commentId: string, newContent: string): Promise<void> {
    if (!selectedPost) return;
    const { error } = await supabase
      .from("forum_comments")
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq("id", commentId);
    if (!error) {
      void loadComments(selectedPost.id);
    }
  }

  /* ─── Delete Comment ─── */
  async function handleDeleteComment(commentId: string): Promise<void> {
    if (!selectedPost) return;
    /* Count the comment + its nested replies to decrement comment_count */
    function countInTree(list: ForumComment[], targetId: string): number {
      for (const c of list) {
        if (c.id === targetId) {
          return 1 + (c.replies ?? []).length;
        }
        const found = countInTree(c.replies ?? [], targetId);
        if (found > 0) return found;
      }
      return 0;
    }
    const deleteCount = countInTree(comments, commentId);
    const { error } = await supabase.from("forum_comments").delete().eq("id", commentId);
    if (!error) {
      const newCount = Math.max(0, (selectedPost.comment_count ?? 0) - deleteCount);
      await supabase.from("forum_posts").update({ comment_count: newCount }).eq("id", selectedPost.id);
      setSelectedPost((prev) => (prev ? { ...prev, comment_count: newCount } : prev));
      void loadComments(selectedPost.id);
    }
  }

  /* ─── Navigate back to list (reload posts for fresh counts) ─── */
  function handleBackToList(): void {
    setViewMode("list");
    setSelectedPost(null);
    void loadPosts();
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
            <p className="mb-2">{t("emptyTitle")}</p>
            <p className="text-text-muted text-sm">
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
            className="button mb-4"
            onClick={() => {
              resetForm();
              setViewMode("list");
            }}
          >
            ← {t("backToForum")}
          </button>
          <ForumPostForm
            formTitle={formTitle}
            formContent={formContent}
            formCategoryId={formCategoryId}
            formPinned={formPinned}
            editingPostId={editingPostId}
            isPreviewMode={isPreviewMode}
            isImageUploading={isImageUploading}
            categories={categories}
            canManage={canManage}
            t={t}
            contentTextareaRef={contentTextareaRef}
            supabase={supabase}
            currentUserId={currentUserId}
            onTitleChange={setFormTitle}
            onContentChange={setFormContent}
            onCategoryChange={setFormCategoryId}
            onPinnedChange={setFormPinned}
            onPreviewToggle={setIsPreviewMode}
            onContentInsert={(md) => setFormContent((prev) => prev + md)}
            onImageUploadingChange={setIsImageUploading}
            onSubmit={handleSubmitPost}
            onCancel={() => {
              resetForm();
              setViewMode("list");
            }}
          />
        </div>
      </>
    );
  }

  /* ═══ RENDER: Post Detail ═══ */
  if (viewMode === "detail" && selectedPost) {
    return (
      <>
        <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
        <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
        <div className="content-inner">
          <button className="button mb-4" onClick={handleBackToList}>
            ← {t("backToForum")}
          </button>
          <ForumPostDetail
            selectedPost={selectedPost}
            comments={comments}
            commentText={commentText}
            replyingTo={replyingTo}
            deletingPostId={deletingPostId}
            currentUserId={currentUserId}
            supabase={supabase}
            canManage={canManage}
            t={t}
            onCommentTextChange={setCommentText}
            onReplyClick={(commentId) => {
              setReplyingTo(commentId);
              setCommentText("");
            }}
            onReplyCancel={() => {
              setReplyingTo("");
              setCommentText("");
            }}
            onSubmitComment={handleSubmitComment}
            onSubmitReply={handleSubmitReply}
            onVotePost={handleVotePost}
            onVoteComment={handleVoteComment}
            onEditPost={handleEditPost}
            onDeleteClick={setDeletingPostId}
            onConfirmDelete={handleConfirmDelete}
            onCancelDelete={() => setDeletingPostId("")}
            onTogglePin={handleTogglePin}
            onToggleLock={handleToggleLock}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onCommentInsert={(md) => setCommentText((prev) => prev + md)}
            detailRef={detailRef}
          />
        </div>
      </>
    );
  }

  /* ═══ RENDER: Post List ═══ */
  return (
    <>
      <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
      <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
      <div className="content-inner">
        <ForumPostList
          posts={posts}
          categories={categories}
          selectedCategory={selectedCategory}
          sortMode={sortMode}
          searchTerm={searchTerm}
          pagination={pagination}
          isLoading={isLoading}
          t={t}
          onSortChange={(mode) => {
            setSortMode(mode);
            pagination.setPage(1);
          }}
          onSearchChange={(value) => {
            setSearchTerm(value);
            pagination.setPage(1);
          }}
          onCategoryClick={(slug) => {
            router.push(`/forum?category=${slug}`);
            pagination.setPage(1);
          }}
          onPostClick={handleOpenPost}
          onVotePost={handleVotePost}
          onNewPost={handleOpenCreate}
          onAllCategories={() => {
            router.push("/forum");
            pagination.setPage(1);
          }}
        />
      </div>
    </>
  );
}

export default ForumClient;
