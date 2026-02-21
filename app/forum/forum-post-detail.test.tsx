// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const React = require("react");
    return React.createElement("img", props);
  },
}));
vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (_importFn: any, opts?: any) => {
    if (opts?.loading) opts.loading();
    const React = require("react");
    return ({ content }: any) => React.createElement("div", { "data-testid": "markdown" }, content);
  },
}));
vi.mock("@/lib/markdown/app-markdown-toolbar", () => ({
  __esModule: true,
  default: () => {
    const React = require("react");
    return React.createElement("div", { "data-testid": "markdown-toolbar" });
  },
  handleImagePaste: vi.fn(),
  handleImageDrop: vi.fn(),
}));
vi.mock("../components/ui/game-button", () => ({
  __esModule: true,
  default: ({ children, disabled, ...props }: any) => {
    const React = require("react");
    return React.createElement("button", { ...props, disabled }, children);
  },
}));
vi.mock("./forum-icons", () => ({
  UpArrow: () => {
    const React = require("react");
    return React.createElement("span", null, "▲");
  },
  DownArrow: () => {
    const React = require("react");
    return React.createElement("span", null, "▼");
  },
  CommentIcon: () => {
    const React = require("react");
    return React.createElement("span", null, "💬");
  },
}));
vi.mock("./forum-utils", () => ({
  formatTimeAgo: () => "2h ago",
}));

import ForumPostDetail from "./forum-post-detail";
import { handleImagePaste, handleImageDrop } from "@/lib/markdown/app-markdown-toolbar";
import type { ForumPost, ForumComment } from "./forum-types";

const t = vi.fn((key: string, values?: any) => (values ? `${key}:${JSON.stringify(values)}` : key));

const basePost: ForumPost = {
  id: "p1",
  title: "Test Post",
  content: "Post content here",
  author_id: "u2",
  authorName: "Author",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: null,
  category_id: "cat1",
  categoryName: "General",
  score: 5,
  userVote: 0,
  comment_count: 2,
  is_pinned: false,
  is_locked: false,
  source_type: null,
  source_id: null,
};

const baseComment: ForumComment = {
  id: "c1",
  post_id: "p1",
  parent_comment_id: null,
  content: "A comment",
  author_id: "u3",
  authorName: "Commenter",
  created_at: "2025-01-01T01:00:00Z",
  updated_at: null,
  score: 1,
  userVote: 0,
  replies: [],
};

function makeBaseProps(overrides: any = {}) {
  return {
    selectedPost: basePost,
    comments: [] as ForumComment[],
    commentText: "",
    replyingTo: "",
    deletingPostId: "",
    currentUserId: "u1",
    supabase: {} as any,
    canManage: false,
    t,
    onCommentTextChange: vi.fn(),
    onReplyClick: vi.fn(),
    onReplyCancel: vi.fn(),
    onSubmitComment: vi.fn(),
    onSubmitReply: vi.fn(),
    onVotePost: vi.fn(),
    onVoteComment: vi.fn(),
    onEditPost: vi.fn(),
    onDeleteClick: vi.fn(),
    onConfirmDelete: vi.fn(),
    onCancelDelete: vi.fn(),
    onTogglePin: vi.fn(),
    onToggleLock: vi.fn(),
    onEditComment: vi.fn(),
    onDeleteComment: vi.fn(),
    onCommentInsert: vi.fn(),
    ...overrides,
  };
}

describe("ForumPostDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Post rendering ──

  it("renders post title and content", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("Post content here")).toBeInTheDocument();
  });

  it("renders vote buttons with score", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getAllByLabelText("upvote").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("downvote").length).toBeGreaterThan(0);
  });

  it("renders category badge", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("does not render category badge when categoryName is null", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, categoryName: null } })} />);
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });

  it("renders author name and time ago", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.getByText("Author", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("2h ago")).toBeInTheDocument();
  });

  it("does not render content section when content is empty", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, content: "" } })} />);
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  // ── Pinned/Locked badges ──

  it("renders pinned badge when post is pinned", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, is_pinned: true } })} />);
    expect(screen.getByText("pinned")).toBeInTheDocument();
  });

  it("renders locked badge when post is locked", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, is_locked: true } })} />);
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("does not render pinned/locked badges for normal posts", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.queryByText("pinned")).not.toBeInTheDocument();
    expect(screen.queryByText("locked")).not.toBeInTheDocument();
  });

  // ── Source type badges ──

  it("renders event source badge", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, source_type: "event" } })} />);
    expect(screen.getByText("sourceEvent")).toBeInTheDocument();
    expect(screen.getByText("goToEvent")).toBeInTheDocument();
  });

  it("renders announcement source badge", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, source_type: "announcement" } })} />);
    expect(screen.getByText("sourceAnnouncement")).toBeInTheDocument();
    expect(screen.getByText("goToAnnouncement")).toBeInTheDocument();
  });

  it("does not render source badges for regular posts", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.queryByText("sourceEvent")).not.toBeInTheDocument();
    expect(screen.queryByText("sourceAnnouncement")).not.toBeInTheDocument();
    expect(screen.queryByText("goToEvent")).not.toBeInTheDocument();
  });

  // ── Moderation buttons ──

  it("does not show edit/delete when user is not author and not manager", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.queryByText("editPost")).not.toBeInTheDocument();
    expect(screen.queryByText("deletePost")).not.toBeInTheDocument();
  });

  it("shows edit/delete when user is the author", () => {
    render(<ForumPostDetail {...makeBaseProps({ currentUserId: "u2" })} />);
    expect(screen.getByText("editPost")).toBeInTheDocument();
    expect(screen.getByText("deletePost")).toBeInTheDocument();
  });

  it("shows edit/delete when user is a manager", () => {
    render(<ForumPostDetail {...makeBaseProps({ canManage: true })} />);
    expect(screen.getByText("editPost")).toBeInTheDocument();
    expect(screen.getByText("deletePost")).toBeInTheDocument();
  });

  it("shows pin/lock buttons only for managers", () => {
    render(<ForumPostDetail {...makeBaseProps({ canManage: true })} />);
    expect(screen.getByText("pin")).toBeInTheDocument();
    expect(screen.getByText("lock")).toBeInTheDocument();
  });

  it("does not show pin/lock for non-managers (even if author)", () => {
    render(<ForumPostDetail {...makeBaseProps({ currentUserId: "u2" })} />);
    expect(screen.queryByText("pin")).not.toBeInTheDocument();
    expect(screen.queryByText("lock")).not.toBeInTheDocument();
  });

  it("shows 'unpin' when post is already pinned", () => {
    render(<ForumPostDetail {...makeBaseProps({ canManage: true, selectedPost: { ...basePost, is_pinned: true } })} />);
    expect(screen.getByText("unpin")).toBeInTheDocument();
  });

  it("shows 'unlock' when post is already locked", () => {
    render(<ForumPostDetail {...makeBaseProps({ canManage: true, selectedPost: { ...basePost, is_locked: true } })} />);
    expect(screen.getByText("unlock")).toBeInTheDocument();
  });

  // ── Vote interactions ──

  it("calls onVotePost when upvote is clicked", () => {
    const onVotePost = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ onVotePost })} />);
    fireEvent.click(screen.getAllByLabelText("upvote")[0]!);
    expect(onVotePost).toHaveBeenCalledWith("p1", 1);
  });

  it("calls onVotePost when downvote is clicked", () => {
    const onVotePost = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ onVotePost })} />);
    fireEvent.click(screen.getAllByLabelText("downvote")[0]!);
    expect(onVotePost).toHaveBeenCalledWith("p1", -1);
  });

  it("applies upvoted class when userVote is 1", () => {
    const { container } = render(
      <ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, userVote: 1 } })} />,
    );
    expect(container.querySelector(".forum-vote-btn.upvoted")).toBeTruthy();
  });

  it("applies downvoted class when userVote is -1", () => {
    const { container } = render(
      <ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, userVote: -1 } })} />,
    );
    expect(container.querySelector(".forum-vote-btn.downvoted")).toBeTruthy();
  });

  // ── Edit/Delete actions ──

  it("calls onEditPost when edit button is clicked", () => {
    const onEditPost = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ currentUserId: "u2", onEditPost })} />);
    fireEvent.click(screen.getByText("editPost"));
    expect(onEditPost).toHaveBeenCalledWith(basePost);
  });

  it("calls onDeleteClick when delete button is clicked", () => {
    const onDeleteClick = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ currentUserId: "u2", onDeleteClick })} />);
    fireEvent.click(screen.getByText("deletePost"));
    expect(onDeleteClick).toHaveBeenCalledWith("p1");
  });

  it("calls onTogglePin when pin button is clicked", () => {
    const onTogglePin = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ canManage: true, onTogglePin })} />);
    fireEvent.click(screen.getByText("pin"));
    expect(onTogglePin).toHaveBeenCalledWith(basePost);
  });

  it("calls onToggleLock when lock button is clicked", () => {
    const onToggleLock = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ canManage: true, onToggleLock })} />);
    fireEvent.click(screen.getByText("lock"));
    expect(onToggleLock).toHaveBeenCalledWith(basePost);
  });

  // ── Delete confirmation ──

  it("renders delete confirmation when deletingPostId is set", () => {
    render(<ForumPostDetail {...makeBaseProps({ deletingPostId: "p1" })} />);
    expect(screen.getByText("deleteConfirmTitle")).toBeInTheDocument();
    expect(screen.getByText("deleteConfirmText")).toBeInTheDocument();
    expect(screen.getByText("deleteConfirmButton")).toBeInTheDocument();
  });

  it("does not render delete confirmation when deletingPostId is empty", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.queryByText("deleteConfirmTitle")).not.toBeInTheDocument();
  });

  it("calls onConfirmDelete when confirm delete button is clicked", () => {
    const onConfirmDelete = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ deletingPostId: "p1", onConfirmDelete })} />);
    fireEvent.click(screen.getByText("deleteConfirmButton"));
    expect(onConfirmDelete).toHaveBeenCalled();
  });

  it("calls onCancelDelete when cancel button in confirm is clicked", () => {
    const onCancelDelete = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ deletingPostId: "p1", onCancelDelete })} />);
    fireEvent.click(screen.getByText("cancel"));
    expect(onCancelDelete).toHaveBeenCalled();
  });

  it("shows linked warning for event source in delete confirmation", () => {
    render(
      <ForumPostDetail
        {...makeBaseProps({
          deletingPostId: "p1",
          selectedPost: { ...basePost, source_type: "event" },
        })}
      />,
    );
    expect(screen.getByText(/deleteLinkedWarning/)).toBeInTheDocument();
  });

  it("shows linked warning for announcement source in delete confirmation", () => {
    render(
      <ForumPostDetail
        {...makeBaseProps({
          deletingPostId: "p1",
          selectedPost: { ...basePost, source_type: "announcement" },
        })}
      />,
    );
    expect(screen.getByText(/deleteLinkedWarning/)).toBeInTheDocument();
  });

  // ── Comments section ──

  it("renders comment count header", () => {
    const { container } = render(<ForumPostDetail {...makeBaseProps()} />);
    const h3 = container.querySelector(".forum-comments-section h3");
    expect(h3?.textContent).toContain("2");
  });

  it("renders 'no comments' when list is empty and not replying", () => {
    render(<ForumPostDetail {...makeBaseProps()} />);
    expect(screen.getByText("noComments")).toBeInTheDocument();
  });

  it("does not render 'no comments' when replyingTo is set", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    expect(screen.queryByText("noComments")).not.toBeInTheDocument();
  });

  it("renders comments when present", () => {
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment] })} />);
    expect(screen.getByText("A comment")).toBeInTheDocument();
    expect(screen.getByText("Commenter")).toBeInTheDocument();
  });

  it("renders nested replies", () => {
    const commentWithReply: ForumComment = {
      ...baseComment,
      replies: [
        {
          id: "r1",
          post_id: "p1",
          parent_comment_id: "c1",
          content: "A reply",
          author_id: "u4",
          authorName: "Replier",
          created_at: "2025-01-01T02:00:00Z",
          updated_at: null,
          score: 0,
          userVote: 0,
          replies: [],
        },
      ],
    };
    render(<ForumPostDetail {...makeBaseProps({ comments: [commentWithReply] })} />);
    expect(screen.getByText("A reply")).toBeInTheDocument();
    expect(screen.getByText("Replier")).toBeInTheDocument();
  });

  it("hides comment button when post is locked", () => {
    render(<ForumPostDetail {...makeBaseProps({ selectedPost: { ...basePost, is_locked: true } })} />);
    const commentBtns = screen.queryAllByText("submitComment");
    expect(commentBtns.length).toBe(0);
  });

  // ── Thread-level comment form ──

  it("renders thread-level comment form when replyingTo is 'thread'", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    const submitButtons = screen.getAllByText("submitComment");
    expect(submitButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("renders write/preview tabs in comment form", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    expect(screen.getByText("write")).toBeInTheDocument();
    expect(screen.getByText("preview")).toBeInTheDocument();
  });

  it("disables submit when commentText is empty", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread", commentText: "" })} />);
    const submitBtns = screen.getAllByText("submitComment");
    const formSubmit = submitBtns.find((btn) => btn.closest(".forum-form"));
    expect(formSubmit).toBeDisabled();
  });

  it("enables submit when commentText is not empty", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread", commentText: "hello" })} />);
    const submitBtns = screen.getAllByText("submitComment");
    const formSubmit = submitBtns.find((btn) => btn.closest(".forum-form"));
    expect(formSubmit).not.toBeDisabled();
  });

  // ── Inline reply form ──

  it("renders inline reply form under a comment when replyingTo matches comment id", () => {
    render(
      <ForumPostDetail
        {...makeBaseProps({
          comments: [baseComment],
          replyingTo: "c1",
          commentText: "reply text",
        })}
      />,
    );
    expect(screen.getByText("submitReply")).toBeInTheDocument();
    expect(screen.getByText(/replyingToLabel/)).toBeInTheDocument();
  });

  it("shows cancel reply button in inline reply form", () => {
    render(
      <ForumPostDetail
        {...makeBaseProps({
          comments: [baseComment],
          replyingTo: "c1",
        })}
      />,
    );
    expect(screen.getByText("cancelReply")).toBeInTheDocument();
  });

  it("calls onReplyCancel when cancel reply is clicked", () => {
    const onReplyCancel = vi.fn();
    render(
      <ForumPostDetail
        {...makeBaseProps({
          comments: [baseComment],
          replyingTo: "c1",
          onReplyCancel,
        })}
      />,
    );
    fireEvent.click(screen.getByText("cancelReply"));
    expect(onReplyCancel).toHaveBeenCalled();
  });

  // ── Comment voting ──

  it("calls onVoteComment when comment upvote is clicked", () => {
    const onVoteComment = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment], onVoteComment })} />);
    const upvotes = screen.getAllByLabelText("upvote");
    fireEvent.click(upvotes[upvotes.length - 1]!);
    expect(onVoteComment).toHaveBeenCalledWith("c1", 1);
  });

  it("calls onVoteComment when comment downvote is clicked", () => {
    const onVoteComment = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment], onVoteComment })} />);
    const downvotes = screen.getAllByLabelText("downvote");
    fireEvent.click(downvotes[downvotes.length - 1]!);
    expect(onVoteComment).toHaveBeenCalledWith("c1", -1);
  });

  // ── Comment edit flow ──

  it("shows edit button for comment author", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    expect(screen.getByText("editComment")).toBeInTheDocument();
  });

  it("shows edit button for managers on any comment", () => {
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment], canManage: true })} />);
    expect(screen.getByText("editComment")).toBeInTheDocument();
  });

  it("does not show edit button for non-author non-manager", () => {
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment] })} />);
    expect(screen.queryByText("editComment")).not.toBeInTheDocument();
  });

  it("hides edit button when post is locked (even for author)", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(
      <ForumPostDetail
        {...makeBaseProps({ comments: [authorComment], selectedPost: { ...basePost, is_locked: true } })}
      />,
    );
    expect(screen.queryByText("editComment")).not.toBeInTheDocument();
  });

  it("enters edit mode when edit comment button is clicked", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    expect(screen.getByText("saveEdit")).toBeInTheDocument();
    expect(screen.getByText("cancelEdit")).toBeInTheDocument();
  });

  it("calls onEditComment when save edit is clicked with content", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    const onEditComment = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment], onEditComment })} />);
    fireEvent.click(screen.getByText("editComment"));
    const textarea = screen.getByDisplayValue("A comment");
    fireEvent.change(textarea, { target: { value: "Edited comment" } });
    fireEvent.click(screen.getByText("saveEdit"));
    expect(onEditComment).toHaveBeenCalledWith("c1", "Edited comment");
  });

  it("cancels edit mode when cancel edit is clicked", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    expect(screen.getByText("saveEdit")).toBeInTheDocument();
    fireEvent.click(screen.getByText("cancelEdit"));
    expect(screen.queryByText("saveEdit")).not.toBeInTheDocument();
  });

  it("disables save edit when edit content is empty", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    const textarea = screen.getByDisplayValue("A comment");
    fireEvent.change(textarea, { target: { value: "  " } });
    expect(screen.getByText("saveEdit")).toBeDisabled();
  });

  // ── Comment delete flow ──

  it("shows delete button for comment author", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    expect(screen.getByText("deleteComment")).toBeInTheDocument();
  });

  it("shows delete confirmation when delete comment is clicked", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("deleteComment"));
    expect(screen.getByText("deleteCommentConfirm")).toBeInTheDocument();
    expect(screen.getByText("deleteCommentButton")).toBeInTheDocument();
  });

  it("calls onDeleteComment when confirm delete is clicked", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    const onDeleteComment = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment], onDeleteComment })} />);
    fireEvent.click(screen.getByText("deleteComment"));
    fireEvent.click(screen.getByText("deleteCommentButton"));
    expect(onDeleteComment).toHaveBeenCalledWith("c1");
  });

  it("cancels delete confirmation", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("deleteComment"));
    expect(screen.getByText("deleteCommentConfirm")).toBeInTheDocument();
    const cancelBtns = screen.getAllByText("cancel");
    fireEvent.click(cancelBtns[cancelBtns.length - 1]!);
    expect(screen.queryByText("deleteCommentConfirm")).not.toBeInTheDocument();
  });

  // ── Comment edited badge ──

  it("shows edited badge when comment updated_at differs from created_at", () => {
    const editedComment = {
      ...baseComment,
      created_at: "2025-01-01T01:00:00Z",
      updated_at: "2025-01-01T01:01:00Z",
    };
    render(<ForumPostDetail {...makeBaseProps({ comments: [editedComment] })} />);
    expect(screen.getByText("(commentEdited)")).toBeInTheDocument();
  });

  it("does not show edited badge when timestamps are close", () => {
    const notEditedComment = {
      ...baseComment,
      created_at: "2025-01-01T01:00:00Z",
      updated_at: "2025-01-01T01:00:01Z",
    };
    render(<ForumPostDetail {...makeBaseProps({ comments: [notEditedComment] })} />);
    expect(screen.queryByText("(commentEdited)")).not.toBeInTheDocument();
  });

  it("does not show edited badge when updated_at is null", () => {
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment] })} />);
    expect(screen.queryByText("(commentEdited)")).not.toBeInTheDocument();
  });

  // ── Reply button visibility ──

  it("shows reply button for top-level comments on unlocked posts", () => {
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment] })} />);
    expect(screen.getByText("reply")).toBeInTheDocument();
  });

  it("hides reply button when post is locked", () => {
    render(
      <ForumPostDetail
        {...makeBaseProps({ comments: [baseComment], selectedPost: { ...basePost, is_locked: true } })}
      />,
    );
    expect(screen.queryByText("reply")).not.toBeInTheDocument();
  });

  // ── Comment form preview ──

  it("shows preview when preview tab is clicked in comment form", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread", commentText: "**bold**" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByText("**bold**")).toBeInTheDocument();
  });

  it("shows empty preview message when comment text is empty", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread", commentText: "" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.getByText("previewEmpty")).toBeInTheDocument();
  });

  it("shows markdown hint in comment form", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    expect(screen.getByText("markdownHint")).toBeInTheDocument();
  });

  // ── Comment form textarea event handlers ──

  it("calls onCommentTextChange when typing in comment form textarea", () => {
    const onCommentTextChange = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread", commentText: "", onCommentTextChange })} />);
    const textarea = screen.getByPlaceholderText("commentPlaceholder");
    fireEvent.change(textarea, { target: { value: "hello world" } });
    expect(onCommentTextChange).toHaveBeenCalledWith("hello world");
  });

  it("calls handleImagePaste on paste in comment form textarea", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    fireEvent.paste(screen.getByPlaceholderText("commentPlaceholder"));
    expect(handleImagePaste).toHaveBeenCalled();
  });

  it("calls handleImageDrop on drop in comment form textarea", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    fireEvent.drop(screen.getByPlaceholderText("commentPlaceholder"));
    expect(handleImageDrop).toHaveBeenCalled();
  });

  it("handles dragover on comment form textarea", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    fireEvent.dragOver(screen.getByPlaceholderText("commentPlaceholder"));
  });

  it("switches back to write tab from preview in comment form", () => {
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread", commentText: "some text" })} />);
    fireEvent.click(screen.getByText("preview"));
    expect(screen.queryByPlaceholderText("commentPlaceholder")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("write"));
    expect(screen.getByPlaceholderText("commentPlaceholder")).toBeInTheDocument();
  });

  // ── Comment edit form preview tabs & textarea events ──

  it("toggles preview tabs in comment edit form", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.click(screen.getByText("preview"));
    expect(screen.queryByDisplayValue("A comment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("write"));
    expect(screen.getByDisplayValue("A comment")).toBeInTheDocument();
  });

  it("calls handleImagePaste on paste in edit textarea", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.paste(screen.getByDisplayValue("A comment"));
    expect(handleImagePaste).toHaveBeenCalled();
  });

  it("invokes insert callback when pasting image in edit textarea", () => {
    (handleImagePaste as any).mockImplementationOnce((_e: any, _s: any, _u: any, insertFn: any) => {
      insertFn("![img](url)");
    });
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.paste(screen.getByDisplayValue("A comment"));
    expect(screen.getByDisplayValue("A comment![img](url)")).toBeInTheDocument();
  });

  it("calls handleImageDrop on drop in edit textarea", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.drop(screen.getByDisplayValue("A comment"));
    expect(handleImageDrop).toHaveBeenCalled();
  });

  it("invokes insert callback when dropping image in edit textarea", () => {
    (handleImageDrop as any).mockImplementationOnce((_e: any, _s: any, _u: any, insertFn: any) => {
      insertFn("![drop](url)");
    });
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.drop(screen.getByDisplayValue("A comment"));
    expect(screen.getByDisplayValue("A comment![drop](url)")).toBeInTheDocument();
  });

  it("handles dragover on edit textarea", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment] })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.dragOver(screen.getByDisplayValue("A comment"));
  });

  // ── handleSaveEdit with empty content ──

  it("does not save edit when content is whitespace only", () => {
    const authorComment = { ...baseComment, author_id: "u1" };
    const onEditComment = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ comments: [authorComment], onEditComment })} />);
    fireEvent.click(screen.getByText("editComment"));
    fireEvent.change(screen.getByDisplayValue("A comment"), { target: { value: "   " } });
    const saveBtn = screen.getByText("saveEdit");
    saveBtn.removeAttribute("disabled");
    fireEvent.click(saveBtn);
    expect(onEditComment).not.toHaveBeenCalled();
  });

  // ── imageUploadErrorHandler ──

  it("logs error via imageUploadErrorHandler on image paste failure", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (handleImagePaste as any).mockImplementationOnce(
      (_e: any, _s: any, _u: any, _i: any, _l: any, _p: any, onError: any) => {
        onError(new Error("upload failed"));
      },
    );
    render(<ForumPostDetail {...makeBaseProps({ replyingTo: "thread" })} />);
    fireEvent.paste(screen.getByPlaceholderText("commentPlaceholder"));
    expect(consoleSpy).toHaveBeenCalledWith("Image upload failed:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── Reply button on comment & handleReplyClick ──

  it("calls onReplyClick via handleReplyClick when reply button is clicked", () => {
    vi.useFakeTimers();
    const onReplyClick = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ comments: [baseComment], onReplyClick })} />);
    fireEvent.click(screen.getByText("reply"));
    expect(onReplyClick).toHaveBeenCalledWith("c1");
    vi.advanceTimersByTime(100);
    vi.useRealTimers();
  });

  it("calls handleReplyClick('thread') when Comment button is clicked", () => {
    vi.useFakeTimers();
    const onReplyClick = vi.fn();
    render(<ForumPostDetail {...makeBaseProps({ onReplyClick })} />);
    fireEvent.click(screen.getByText("submitComment"));
    expect(onReplyClick).toHaveBeenCalledWith("thread");
    vi.advanceTimersByTime(100);
    vi.useRealTimers();
  });
});
