"use client";

import { useCallback, useState, type FormEvent, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { formatLocalDateTime } from "@/lib/date-format";
import { useSupabase } from "@/app/hooks/use-supabase";
import { BUG_SCREENSHOTS_BUCKET } from "@/lib/constants";
import MarkdownEditor from "@/app/components/markdown-editor";
import { useBugComments } from "./use-bug-comments";
import type { BugCommentWithAuthor } from "./bugs-types";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-8 rounded" />,
});

interface BugsCommentsProps {
  readonly reportId: string;
  readonly currentUserId: string;
  readonly canManage: boolean;
}

function getAuthorName(author: { username: string | null; display_name: string | null } | null): string {
  if (!author) return "Unknown";
  return author.display_name ?? author.username ?? "Unknown";
}

/* ── Single comment item with inline edit/delete ── */

interface CommentItemProps {
  readonly comment: BugCommentWithAuthor;
  readonly currentUserId: string;
  readonly canManage: boolean;
  readonly onEdit: (id: string, content: string) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<boolean>;
  readonly locale: string;
  readonly supabase: ReturnType<typeof useSupabase>;
}

function CommentItem({
  comment,
  currentUserId,
  canManage,
  onEdit,
  onDelete,
  locale,
  supabase,
}: CommentItemProps): ReactElement {
  const t = useTranslations("bugs.comments");

  const isAuthor = currentUserId === comment.author_id;
  const canEditThis = canManage || isAuthor;
  const canDeleteThis = canManage || isAuthor;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleStartEdit = useCallback(() => {
    setEditContent(comment.content);
    setIsEditing(true);
    setIsConfirmingDelete(false);
  }, [comment.content]);

  const handleSaveEdit = useCallback(async () => {
    if (!editContent.trim()) return;
    const ok = await onEdit(comment.id, editContent.trim());
    if (ok) setIsEditing(false);
  }, [editContent, comment.id, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent("");
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    await onDelete(comment.id);
    setIsConfirmingDelete(false);
  }, [comment.id, onDelete]);

  const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

  return (
    <div className="bugs-comment">
      <div className="bugs-comment-header">
        <span className="bugs-comment-author">{getAuthorName(comment.author)}</span>
        <span className="bugs-comment-date">
          {formatLocalDateTime(comment.created_at, locale)}
          {isEdited && <em style={{ marginLeft: 4 }}>({t("edited")})</em>}
        </span>
      </div>

      {isEditing ? (
        <div className="bugs-comment-edit-form">
          <MarkdownEditor
            value={editContent}
            onChange={setEditContent}
            supabase={supabase}
            userId={currentUserId}
            rows={5}
            minHeight={140}
            storageBucket={BUG_SCREENSHOTS_BUCKET}
          />
          <div className="bugs-comment-edit-actions">
            <button
              className="button primary py-1 px-3"
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
              style={{ fontSize: "0.75rem" }}
              type="button"
            >
              {t("saveEdit")}
            </button>
            <button
              className="button py-1 px-3"
              onClick={handleCancelEdit}
              style={{ fontSize: "0.75rem" }}
              type="button"
            >
              {t("cancelEdit")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bugs-comment-body">
            <AppMarkdown content={comment.content} />
          </div>
          {(canEditThis || canDeleteThis) && (
            <div className="bugs-comment-actions">
              {canEditThis && (
                <button className="bugs-comment-action-btn" onClick={handleStartEdit} type="button">
                  {t("editComment")}
                </button>
              )}
              {canDeleteThis && (
                <button
                  className="bugs-comment-action-btn danger"
                  onClick={() => setIsConfirmingDelete(true)}
                  type="button"
                >
                  {t("deleteComment")}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {isConfirmingDelete && (
        <div className="bugs-comment-delete-confirm">
          <span>{t("confirmDelete")}</span>
          <button
            className="button danger py-1 px-2"
            onClick={handleConfirmDelete}
            style={{ fontSize: "0.7rem" }}
            type="button"
          >
            {t("confirmDeleteBtn")}
          </button>
          <button
            className="button py-1 px-2"
            onClick={() => setIsConfirmingDelete(false)}
            style={{ fontSize: "0.7rem" }}
            type="button"
          >
            {t("cancelEdit")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Comment list + add form ── */

function BugsComments({ reportId, currentUserId, canManage }: BugsCommentsProps): ReactElement {
  const t = useTranslations("bugs.comments");
  const locale = useLocale();
  const supabase = useSupabase();
  const { comments, isLoading, isSubmitting, addComment, editComment, deleteComment } = useBugComments(reportId);

  const [newComment, setNewComment] = useState("");

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      const ok = await addComment(newComment.trim());
      if (ok) setNewComment("");
    },
    [newComment, addComment],
  );

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{t("title")}</div>
        </div>
      </div>

      <div className="px-4 pb-4">
        {isLoading && <div className="alert info loading">{t("title")}</div>}

        {!isLoading && comments.length === 0 && (
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            {t("noComments")}
          </p>
        )}

        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            canManage={canManage}
            onEdit={editComment}
            onDelete={deleteComment}
            locale={locale}
            supabase={supabase}
          />
        ))}

        {/* Add comment form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="bug-comment">
              {t("addComment")}
            </label>
            <MarkdownEditor
              id="bug-comment"
              value={newComment}
              onChange={setNewComment}
              supabase={supabase}
              userId={currentUserId}
              placeholder={t("placeholder")}
              rows={5}
              minHeight={140}
              storageBucket={BUG_SCREENSHOTS_BUCKET}
            />
          </div>
          <button className="button primary" type="submit" disabled={isSubmitting || !newComment.trim()}>
            {isSubmitting ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </section>
  );
}

export default BugsComments;
