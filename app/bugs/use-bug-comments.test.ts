// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const mockPushToast = vi.fn();

vi.mock("@/app/components/toast-provider", () => ({
  useToast: vi.fn(() => ({ pushToast: mockPushToast })),
}));

import { useBugComments } from "./use-bug-comments";
import type { BugCommentWithAuthor } from "./bugs-types";

const MOCK_COMMENT: BugCommentWithAuthor = {
  id: "comment-1",
  report_id: "bug-1",
  content: "This is a comment",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: null,
  author_id: "user-1",
  author: { username: "testuser", display_name: "Test User" },
};

describe("useBugComments", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes("/comments") && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [MOCK_COMMENT] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }),
    );
  });

  it("starts with empty state when reportId is null", () => {
    const { result } = renderHook(() => useBugComments(null));

    expect(result.current.comments).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("loads comments when reportId is provided", async () => {
    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0]!.content).toBe("This is a comment");
  });

  it("adds a comment successfully", async () => {
    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.addComment("New comment");
    });

    expect(success).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("returns false when adding comment with null reportId", async () => {
    const { result } = renderHook(() => useBugComments(null));

    let success = false;
    await act(async () => {
      success = await result.current.addComment("New comment");
    });

    expect(success).toBe(false);
  });

  it("handles add comment failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === "POST") {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [MOCK_COMMENT] }),
        });
      }),
    );

    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.addComment("Will fail");
    });

    expect(success).toBe(false);
    expect(mockPushToast).toHaveBeenCalledWith("Failed to add comment.");
  });

  it("edits a comment successfully", async () => {
    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.editComment("comment-1", "Updated comment");
    });

    expect(success).toBe(true);
  });

  it("handles edit comment failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === "PATCH") {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [MOCK_COMMENT] }),
        });
      }),
    );

    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.editComment("comment-1", "Will fail");
    });

    expect(success).toBe(false);
    expect(mockPushToast).toHaveBeenCalledWith("Failed to update comment.");
  });

  it("deletes a comment successfully", async () => {
    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteComment("comment-1");
    });

    expect(success).toBe(true);
  });

  it("handles delete comment failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (options?.method === "DELETE") {
          return Promise.resolve({ ok: false });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [MOCK_COMMENT] }),
        });
      }),
    );

    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success = false;
    await act(async () => {
      success = await result.current.deleteComment("comment-1");
    });

    expect(success).toBe(false);
    expect(mockPushToast).toHaveBeenCalledWith("Failed to delete comment.");
  });

  it("handles load comments failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useBugComments("bug-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPushToast).toHaveBeenCalledWith("Failed to load comments.");
  });

  it("reloads comments when reportId changes", async () => {
    const fetchSpy = vi.fn().mockImplementation((_url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [MOCK_COMMENT] }),
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { result, rerender } = renderHook(({ id }) => useBugComments(id), {
      initialProps: { id: "bug-1" as string | null },
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const callsBefore = fetchSpy.mock.calls.length;

    rerender({ id: "bug-2" });

    await waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
