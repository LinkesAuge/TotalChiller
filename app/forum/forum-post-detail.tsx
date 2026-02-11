"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { RefObject } from "react";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-32 rounded" />,
});
import { UpArrow, DownArrow, CommentIcon } from "./forum-icons";
import { formatTimeAgo, type TFunction } from "./forum-utils";
import type { ForumPost, ForumComment } from "./forum-types";

export interface ForumPostDetailProps {
  readonly selectedPost: ForumPost;
  readonly comments: ForumComment[];
  readonly commentText: string;
  readonly replyText: string;
  readonly replyingTo: string;
  readonly deletingPostId: string;
  readonly currentUserId: string;
  readonly canManage: boolean;
  readonly t: TFunction;
  readonly onCommentTextChange: (value: string) => void;
  readonly onReplyTextChange: (value: string) => void;
  readonly onReplyClick: (commentId: string) => void;
  readonly onReplyCancel: () => void;
  readonly onSubmitComment: () => void;
  readonly onSubmitReply: () => void;
  readonly onVotePost: (postId: string, voteType: number) => void;
  readonly onVoteComment: (commentId: string, voteType: number) => void;
  readonly onEditPost: (post: ForumPost) => void;
  readonly onDeleteClick: (postId: string) => void;
  readonly onConfirmDelete: () => void;
  readonly onCancelDelete: () => void;
  readonly onTogglePin: (post: ForumPost) => void;
  readonly onToggleLock: (post: ForumPost) => void;
  readonly onEditComment: (commentId: string, newContent: string) => void;
  readonly onDeleteComment: (commentId: string) => void;
  readonly detailRef?: RefObject<HTMLElement | null>;
}

/**
 * Returns true if the given comment has been edited (updated_at differs from created_at).
 */
function isCommentEdited(comment: ForumComment): boolean {
  if (!comment.updated_at || !comment.created_at) return false;
  return new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 2000;
}

/**
 * Renders a single comment with vote column, body, actions, and inline edit/delete UI.
 */
function CommentItem({
  comment,
  isReply,
  selectedPost,
  currentUserId,
  canManage,
  t,
  onVoteComment,
  onReplyClick,
  onEditComment,
  onDeleteComment,
}: {
  readonly comment: ForumComment;
  readonly isReply: boolean;
  readonly selectedPost: ForumPost;
  readonly currentUserId: string;
  readonly canManage: boolean;
  readonly t: TFunction;
  readonly onVoteComment: (commentId: string, voteType: number) => void;
  readonly onReplyClick: (commentId: string) => void;
  readonly onEditComment: (commentId: string, newContent: string) => void;
  readonly onDeleteComment: (commentId: string) => void;
}): JSX.Element {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editContent, setEditContent] = useState<string>("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const isAuthor = currentUserId === comment.author_id;
  const canEditThis = canManage || isAuthor;
  const canDeleteThis = canManage || isAuthor;

  function handleStartEdit(): void {
    setEditContent(comment.content);
    setIsEditing(true);
    setIsConfirmingDelete(false);
  }

  function handleSaveEdit(): void {
    if (!editContent.trim()) return;
    onEditComment(comment.id, editContent.trim());
    setIsEditing(false);
    setEditContent("");
  }

  function handleCancelEdit(): void {
    setIsEditing(false);
    setEditContent("");
  }

  function handleConfirmDelete(): void {
    onDeleteComment(comment.id);
    setIsConfirmingDelete(false);
  }

  return (
    <div className="forum-comment">
      <div className="forum-comment-vote">
        <button
          className={`forum-vote-btn${comment.userVote === 1 ? " upvoted" : ""}`}
          onClick={() => onVoteComment(comment.id, 1)}
          aria-label={t("upvote")}
          type="button"
        >
          <UpArrow />
        </button>
        <span className="forum-vote-score">{comment.score}</span>
        <button
          className={`forum-vote-btn${comment.userVote === -1 ? " downvoted" : ""}`}
          onClick={() => onVoteComment(comment.id, -1)}
          aria-label={t("downvote")}
          type="button"
        >
          <DownArrow />
        </button>
      </div>
      <div className="forum-comment-body">
        <div className="forum-comment-meta">
          <strong>{comment.authorName}</strong>
          <span>&middot;</span>
          <span>{formatTimeAgo(comment.created_at, t)}</span>
          {isCommentEdited(comment) && <span className="forum-comment-edited">({t("commentEdited")})</span>}
        </div>
        {isEditing ? (
          <div className="forum-comment-edit-form">
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
            <div className="forum-comment-edit-actions">
              <button
                className="button primary py-1 px-3"
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                style={{ fontSize: "0.75rem" }}
              >
                {t("saveEdit")}
              </button>
              <button className="button py-1 px-3" onClick={handleCancelEdit} style={{ fontSize: "0.75rem" }}>
                {t("cancelEdit")}
              </button>
            </div>
          </div>
        ) : (
          <div className="forum-comment-text">
            <AppMarkdown content={comment.content} />
          </div>
        )}
        {!isEditing && (
          <div className="forum-comment-actions">
            {!isReply && selectedPost && !selectedPost.is_locked && (
              <button className="forum-comment-action-btn" onClick={() => onReplyClick(comment.id)} type="button">
                {t("reply")}
              </button>
            )}
            {canEditThis && !selectedPost.is_locked && (
              <button className="forum-comment-action-btn" onClick={handleStartEdit} type="button">
                {t("editComment")}
              </button>
            )}
            {canDeleteThis && (
              <button
                className="forum-comment-action-btn danger"
                onClick={() => setIsConfirmingDelete(true)}
                type="button"
              >
                {t("deleteComment")}
              </button>
            )}
          </div>
        )}
        {isConfirmingDelete && (
          <div className="forum-comment-delete-confirm">
            <span>{t("deleteCommentConfirm")}</span>
            <button className="button danger py-1 px-2" onClick={handleConfirmDelete} style={{ fontSize: "0.7rem" }}>
              {t("deleteCommentButton")}
            </button>
            <button
              className="button py-1 px-2"
              onClick={() => setIsConfirmingDelete(false)}
              style={{ fontSize: "0.7rem" }}
            >
              {t("cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ForumPostDetail({
  selectedPost,
  comments,
  commentText,
  replyText,
  replyingTo,
  deletingPostId,
  currentUserId,
  canManage,
  t,
  onCommentTextChange,
  onReplyTextChange,
  onReplyClick,
  onReplyCancel,
  onSubmitComment,
  onSubmitReply,
  onVotePost,
  onVoteComment,
  onEditPost,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
  onTogglePin,
  onToggleLock,
  onEditComment,
  onDeleteComment,
  detailRef,
}: ForumPostDetailProps): JSX.Element {
  const isAuthor = currentUserId === selectedPost.author_id;
  const canModerate = canManage || isAuthor;

  return (
    <>
      <section className="forum-detail-card" ref={detailRef}>
        <div className="forum-detail-header">
          {/* Vote column */}
          <div className="forum-vote-col pr-1.5" style={{ background: "transparent", minWidth: "auto" }}>
            <button
              className={`forum-vote-btn${selectedPost.userVote === 1 ? " upvoted" : ""}`}
              onClick={() => onVotePost(selectedPost.id, 1)}
              aria-label={t("upvote")}
              type="button"
            >
              <UpArrow />
            </button>
            <span className="forum-vote-score">{selectedPost.score}</span>
            <button
              className={`forum-vote-btn${selectedPost.userVote === -1 ? " downvoted" : ""}`}
              onClick={() => onVotePost(selectedPost.id, -1)}
              aria-label={t("downvote")}
              type="button"
            >
              <DownArrow />
            </button>
          </div>
          <div className="flex-1">
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
            <AppMarkdown content={selectedPost.content} />
          </div>
        )}
        <div className="forum-detail-actions">
          <span
            className="flex items-center gap-1"
            style={{
              fontSize: "0.78rem",
              color: "var(--color-text-muted)",
            }}
          >
            <CommentIcon /> {selectedPost.comment_count} {t("comments")}
          </span>
          {canModerate && (
            <>
              <button className="forum-mod-btn" onClick={() => onEditPost(selectedPost)} type="button">
                {t("editPost")}
              </button>
              <button className="forum-mod-btn danger" onClick={() => onDeleteClick(selectedPost.id)} type="button">
                {t("deletePost")}
              </button>
            </>
          )}
          {canManage && (
            <>
              <button className="forum-mod-btn" onClick={() => onTogglePin(selectedPost)} type="button">
                {selectedPost.is_pinned ? t("unpin") : t("pin")}
              </button>
              <button className="forum-mod-btn" onClick={() => onToggleLock(selectedPost)} type="button">
                {selectedPost.is_locked ? t("unlock") : t("lock")}
              </button>
            </>
          )}
        </div>
      </section>

      {/* Delete confirmation */}
      {deletingPostId && (
        <div className="card mt-3" style={{ borderColor: "var(--color-accent-red)" }}>
          <div className="card-header">
            <h4 className="card-title">{t("deleteConfirmTitle")}</h4>
          </div>
          <p className="pt-0 px-4 pb-2" style={{ fontSize: "0.84rem", color: "var(--color-text-2)" }}>
            {t("deleteConfirmText")}
          </p>
          <div className="flex gap-2 pt-0 px-4 pb-4">
            <button className="button danger" onClick={onConfirmDelete}>
              {t("deleteConfirmButton")}
            </button>
            <button className="button" onClick={onCancelDelete}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <section className="forum-comments-section">
        <h3>
          {t("comments")} ({selectedPost.comment_count})
        </h3>

        {/* Add comment form */}
        {!selectedPost.is_locked && (
          <div className="forum-form mb-4">
            <textarea
              value={commentText}
              onChange={(e) => onCommentTextChange(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
            />
            <div className="forum-form-row">
              <button className="button primary" onClick={onSubmitComment} disabled={!commentText.trim()}>
                {t("submitComment")}
              </button>
            </div>
          </div>
        )}

        {/* Comment list */}
        {comments.length === 0 && <p className="text-text-muted text-[0.84rem]">{t("noComments")}</p>}
        {comments.map((comment) => (
          <div key={comment.id}>
            <CommentItem
              comment={comment}
              isReply={false}
              selectedPost={selectedPost}
              currentUserId={currentUserId}
              canManage={canManage}
              t={t}
              onVoteComment={onVoteComment}
              onReplyClick={onReplyClick}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
            />
            {(comment.replies ?? []).map((reply) => (
              <div key={reply.id} className="forum-reply">
                <CommentItem
                  comment={reply}
                  isReply={true}
                  selectedPost={selectedPost}
                  currentUserId={currentUserId}
                  canManage={canManage}
                  t={t}
                  onVoteComment={onVoteComment}
                  onReplyClick={onReplyClick}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                />
              </div>
            ))}
            {/* Reply form */}
            {replyingTo === comment.id && !selectedPost.is_locked && (
              <div className="forum-reply pt-2 pb-2">
                <div className="forum-form p-2.5">
                  <textarea
                    value={replyText}
                    onChange={(e) => onReplyTextChange(e.target.value)}
                    placeholder={t("replyPlaceholder")}
                    rows={2}
                    className="min-h-12"
                  />
                  <div className="forum-form-row">
                    <button
                      className="button primary py-1 px-3"
                      onClick={onSubmitReply}
                      disabled={!replyText.trim()}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {t("submitReply")}
                    </button>
                    <button className="button py-1 px-3 text-xs" onClick={onReplyCancel}>
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
