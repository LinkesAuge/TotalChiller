// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { createMockSupabase } from "@/test/mocks/supabase";

vi.mock("@/lib/constants", () => ({
  FORUM_IMAGES_BUCKET: "forum-images",
}));

vi.mock("@/lib/markdown/app-markdown-toolbar", () => ({
  generateStoragePath: vi.fn((userId: string, fileName: string) => `${userId}/mock_${fileName}`),
}));

import { useBannerUpload } from "./use-banner-upload";

function createFileEvent(file: File | null): ChangeEvent<HTMLInputElement> {
  return {
    target: { files: file ? [file] : [] },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

describe("useBannerUpload", () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>["supabase"];
  let mockStorage: ReturnType<typeof createMockSupabase>["mockStorage"];
  let onSuccess: ReturnType<typeof vi.fn<(publicUrl: string) => void>>;
  let onError: ReturnType<typeof vi.fn<(message: string) => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    mockSupabase = mock.supabase;
    mockStorage = mock.mockStorage;
    onSuccess = vi.fn<(publicUrl: string) => void>();
    onError = vi.fn<(message: string) => void>();
  });

  it("starts with isBannerUploading false", () => {
    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
      }),
    );

    expect(result.current.isBannerUploading).toBe(false);
  });

  it("does nothing when no file is selected", async () => {
    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
      }),
    );

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(null));
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("does nothing when userId is null", async () => {
    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: null,
        onSuccess,
        onError,
      }),
    );

    const file = new File(["x"], "test.png", { type: "image/png" });

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(file));
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("rejects invalid file types", async () => {
    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
      }),
    );

    const file = new File(["x"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(file));
    });

    expect(onError).toHaveBeenCalledWith("Invalid file type. Use JPEG, PNG, GIF, or WebP.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("rejects files exceeding 5 MB", async () => {
    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
      }),
    );

    const largeContent = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([largeContent], "big.png", { type: "image/png" });

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(file));
    });

    expect(onError).toHaveBeenCalledWith("File too large. Maximum size is 5 MB.");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("uploads successfully and calls onSuccess with public URL", async () => {
    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
      }),
    );

    const file = new File(["img"], "banner.png", { type: "image/png" });

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(file));
    });

    expect(mockStorage.from).toHaveBeenCalledWith("forum-images");
    expect(onSuccess).toHaveBeenCalledWith("https://example.com/file.png");
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.isBannerUploading).toBe(false);
  });

  it("calls onError when upload fails", async () => {
    mockStorage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Storage error" },
      }),
      getPublicUrl: vi.fn(),
    });

    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
      }),
    );

    const file = new File(["img"], "banner.png", { type: "image/png" });

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(file));
    });

    expect(onError).toHaveBeenCalledWith("Storage error");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.isBannerUploading).toBe(false);
  });

  it("uses custom filePrefix in storage path", async () => {
    const uploadMock = vi.fn().mockResolvedValue({
      data: { path: "test-path" },
      error: null,
    });
    const getPublicUrlMock = vi.fn().mockReturnValue({
      data: { publicUrl: "https://example.com/file.png" },
    });
    mockStorage.from.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    });

    const { result } = renderHook(() =>
      useBannerUpload({
        supabase: mockSupabase,
        userId: "user-1",
        onSuccess,
        onError,
        filePrefix: "event_banner",
      }),
    );

    const file = new File(["img"], "pic.jpg", { type: "image/jpeg" });

    await act(async () => {
      await result.current.handleBannerUpload(createFileEvent(file));
    });

    expect(uploadMock).toHaveBeenCalledWith("user-1/mock_event_banner_pic.jpg", file);
  });

  it("accepts all valid image types", async () => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    for (const type of validTypes) {
      vi.clearAllMocks();
      const mock = createMockSupabase();

      const { result } = renderHook(() =>
        useBannerUpload({
          supabase: mock.supabase,
          userId: "user-1",
          onSuccess,
          onError,
        }),
      );

      const file = new File(["img"], "test.img", { type });

      await act(async () => {
        await result.current.handleBannerUpload(createFileEvent(file));
      });

      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    }
  });
});
