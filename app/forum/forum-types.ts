/* Forum-specific types and constants */

export interface ForumPost {
  readonly id: string;
  readonly category_id: string | null;
  readonly author_id: string;
  readonly title: string;
  readonly content: string | null;
  readonly is_pinned: boolean;
  readonly is_locked: boolean;
  readonly score: number;
  readonly comment_count: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly source_type: string | null;
  readonly source_id: string | null;
  /* resolved client-side */
  readonly authorName?: string;
  readonly categoryName?: string;
  readonly categorySlug?: string;
  readonly userVote?: number; // -1, 0, 1
}

export interface ForumComment {
  readonly id: string;
  readonly post_id: string;
  readonly parent_comment_id: string | null;
  readonly author_id: string;
  readonly content: string;
  readonly score: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly authorName?: string;
  readonly userVote?: number;
  readonly replies?: ForumComment[];
}

export type SortMode = "hot" | "new" | "top";
export type ViewMode = "list" | "detail" | "create" | "edit";

/** No fallback categories — categories are managed via Admin > Forum. */
export const PAGE_SIZE = 20;
