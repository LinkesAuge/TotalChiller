"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";
import useClanContext from "../hooks/use-clan-context";
import ForumPostForm from "./forum-post-form";
import ForumPostDetail from "./forum-post-detail";
import ForumPostList from "./forum-post-list";
import { useForum } from "./use-forum";

/**
 * Forum client orchestrator. Composes useForum hook, ForumPostList, ForumPostForm,
 * and ForumPostDetail to render list, create/edit, and detail views.
 */
function ForumClient(): JSX.Element {
  const t = useTranslations("forum");
  const router = useRouter();
  const clanContext = useClanContext();

  const forum = useForum(t);

  const {
    categories,
    posts,
    comments,
    selectedCategory,
    sortMode,
    viewMode,
    selectedPost,
    searchTerm,
    isLoading,
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
    setSortMode,
    setSearchTerm,
    handleOpenPost,
    handleVotePost,
    handleVoteComment,
    handleOpenCreate,
    handleEditPost,
    handleSubmitPost,
    resetFormAndSetList,
    handleConfirmDelete,
    handleTogglePin,
    handleToggleLock,
    handleSubmitComment,
    handleSubmitReply,
    handleEditComment,
    handleDeleteComment,
    handleBackToList,
  } = forum;

  /* ─── No clan context ─── */
  if (!clanContext) {
    return (
      <>
        <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
        <SectionHero title={t("title")} subtitle={t("subtitle")} bannerSrc="/assets/banners/banner_tournir_kvk.png" />
        <div className="content-inner">
          <div className="forum-empty">
            <p>{t("selectClanToView")}</p>
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
            <p className="text-text-muted text-sm">{t("tablesNotReadyHint")}</p>
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
          <button className="button mb-4" onClick={resetFormAndSetList} type="button">
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
            supabase={forum.supabase}
            currentUserId={currentUserId}
            onTitleChange={setFormTitle}
            onContentChange={setFormContent}
            onCategoryChange={setFormCategoryId}
            onPinnedChange={setFormPinned}
            onPreviewToggle={setIsPreviewMode}
            onContentInsert={(md) => setFormContent((prev) => prev + md)}
            onImageUploadingChange={setIsImageUploading}
            onSubmit={handleSubmitPost}
            onCancel={resetFormAndSetList}
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
          <button className="button mb-4" onClick={handleBackToList} type="button">
            ← {t("backToForum")}
          </button>
          <ForumPostDetail
            selectedPost={selectedPost}
            comments={comments}
            commentText={commentText}
            replyingTo={replyingTo}
            deletingPostId={deletingPostId}
            currentUserId={currentUserId}
            supabase={forum.supabase}
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
