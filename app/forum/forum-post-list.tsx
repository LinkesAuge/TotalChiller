"use client";

import ForumMarkdown, { extractThumbnail } from "./forum-markdown";
import { UpArrow, DownArrow, CommentIcon, PostThumbnailBox } from "./forum-icons";
import { formatTimeAgo } from "./forum-utils";
import type { ForumPost, SortMode } from "./forum-types";
import { PAGE_SIZE } from "./forum-types";
import type { ForumCategory } from "@/lib/types/domain";
import type { TFunction } from "./forum-utils";

export interface ForumPostListProps {
  readonly posts: ForumPost[];
  readonly categories: ForumCategory[];
  readonly selectedCategory: string;
  readonly sortMode: SortMode;
  readonly searchTerm: string;
  readonly totalCount: number;
  readonly page: number;
  readonly isLoading: boolean;
  readonly t: TFunction;
  readonly onSortChange: (mode: SortMode) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onCategoryClick: (slug: string) => void;
  readonly onPageChange: (page: number) => void;
  readonly onPostClick: (post: ForumPost) => void;
  readonly onVotePost: (postId: string, voteType: number) => void;
  readonly onNewPost: () => void;
  readonly onAllCategories: () => void;
}

export default function ForumPostList({
  posts,
  categories,
  selectedCategory,
  sortMode,
  searchTerm,
  totalCount,
  page,
  isLoading,
  t,
  onSortChange,
  onSearchChange,
  onCategoryClick,
  onPageChange,
  onPostClick,
  onVotePost,
  onNewPost,
  onAllCategories,
}: ForumPostListProps): JSX.Element {
  return (
    <>
      <div className="forum-toolbar">
        <div className="forum-sort-group">
          <button
            className={`forum-sort-btn${sortMode === "hot" ? " active" : ""}`}
            onClick={() => onSortChange("hot")}
            type="button"
          >
            {t("sortHot")}
          </button>
          <button
            className={`forum-sort-btn${sortMode === "new" ? " active" : ""}`}
            onClick={() => onSortChange("new")}
            type="button"
          >
            {t("sortNew")}
          </button>
          <button
            className={`forum-sort-btn${sortMode === "top" ? " active" : ""}`}
            onClick={() => onSortChange("top")}
            type="button"
          >
            {t("sortTop")}
          </button>
        </div>
        <input
          type="text"
          className="form-input py-1.5 px-2.5 bg-surface text-text border border-edge rounded-sm"
          placeholder={t("search")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ maxWidth: 260, fontSize: "0.78rem" }}
        />
        <div className="ml-auto">
          <button className="button primary" onClick={onNewPost}>
            {t("newPost")}
          </button>
        </div>
      </div>

      <div className="forum-categories mb-4">
        <button
          className={`forum-cat-pill${!selectedCategory ? " active" : ""}`}
          onClick={onAllCategories}
          type="button"
        >
          {t("allCategories")}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`forum-cat-pill${selectedCategory === cat.id ? " active" : ""}`}
            onClick={() => onCategoryClick(cat.slug)}
            type="button"
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="forum-empty">
          <p>Loading...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="forum-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <p>{searchTerm ? t("noResults") : t("noPosts")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="forum-post-card"
              onClick={() => onPostClick(post)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPostClick(post);
                }
              }}
            >
              <div
                className="forum-vote-col"
                role="presentation"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <button
                  className={`forum-vote-btn${post.userVote === 1 ? " upvoted" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onVotePost(post.id, 1);
                  }}
                  aria-label={t("upvote")}
                  type="button"
                >
                  <UpArrow />
                </button>
                <span className="forum-vote-score">{post.score}</span>
                <button
                  className={`forum-vote-btn${post.userVote === -1 ? " downvoted" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onVotePost(post.id, -1);
                  }}
                  aria-label={t("downvote")}
                  type="button"
                >
                  <DownArrow />
                </button>
              </div>
              <PostThumbnailBox thumbnail={extractThumbnail(post.content)} />
              <div className="forum-post-body">
                <div className="forum-post-meta">
                  {post.categoryName && <span className="forum-cat-badge">{post.categoryName}</span>}
                  <span>
                    {t("by")} {post.authorName}
                  </span>
                  <span>{formatTimeAgo(post.created_at, t)}</span>
                  {post.is_pinned && <span className="forum-badge-pinned">{t("pinned")}</span>}
                  {post.is_locked && <span className="forum-badge-locked">{t("locked")}</span>}
                </div>
                <h3 className="forum-post-title">{post.title}</h3>
                {post.content && (
                  <div className="forum-post-preview">
                    <ForumMarkdown content={post.content} preview />
                  </div>
                )}
                <div className="forum-post-footer">
                  <span>
                    <CommentIcon /> {post.comment_count} {t("comments")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalCount > PAGE_SIZE && (
        <div className="flex justify-center items-center gap-2.5 mt-4">
          <button
            className="button py-1.5 px-3"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            style={{ fontSize: "0.78rem" }}
          >
            ←
          </button>
          <span className="text-[0.78rem] text-text-2">
            {t("showing", {
              from: (page - 1) * PAGE_SIZE + 1,
              to: Math.min(page * PAGE_SIZE, totalCount),
              total: totalCount,
            })}
          </span>
          <button
            className="button py-1.5 px-3"
            disabled={page * PAGE_SIZE >= totalCount}
            onClick={() => onPageChange(page + 1)}
            style={{ fontSize: "0.78rem" }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
