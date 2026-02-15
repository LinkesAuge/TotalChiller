"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/components/toast-provider";
import type { BugCommentWithAuthor } from "./bugs-types";

interface UseBugCommentsResult {
  readonly comments: readonly BugCommentWithAuthor[];
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  readonly loadComments: () => Promise<void>;
  readonly addComment: (content: string) => Promise<boolean>;
  readonly editComment: (commentId: string, content: string) => Promise<boolean>;
  readonly deleteComment: (commentId: string) => Promise<boolean>;
}

export function useBugComments(reportId: string | null): UseBugCommentsResult {
  const { pushToast } = useToast();

  const [comments, setComments] = useState<readonly BugCommentWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    if (!reportId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bugs/${reportId}/comments`);
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as { data: BugCommentWithAuthor[] };
      setComments(json.data);
    } catch {
      pushToast("Failed to load comments.");
    } finally {
      setIsLoading(false);
    }
  }, [reportId, pushToast]);

  const addComment = useCallback(
    async (content: string): Promise<boolean> => {
      if (!reportId) return false;
      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/bugs/${reportId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error("Failed");
        await loadComments();
        return true;
      } catch {
        pushToast("Failed to add comment.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [reportId, loadComments, pushToast],
  );

  const editComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      if (!reportId) return false;
      try {
        const res = await fetch(`/api/bugs/${reportId}/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) throw new Error("Failed");
        await loadComments();
        return true;
      } catch {
        pushToast("Failed to update comment.");
        return false;
      }
    },
    [reportId, loadComments, pushToast],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!reportId) return false;
      try {
        const res = await fetch(`/api/bugs/${reportId}/comments/${commentId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed");
        await loadComments();
        return true;
      } catch {
        pushToast("Failed to delete comment.");
        return false;
      }
    },
    [reportId, loadComments, pushToast],
  );

  useEffect(() => {
    if (reportId) void loadComments();
  }, [reportId, loadComments]);

  return { comments, isLoading, isSubmitting, loadComments, addComment, editComment, deleteComment };
}
