"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FORUM_IMAGES_BUCKET } from "@/lib/constants";
import { generateStoragePath } from "@/lib/markdown/app-markdown-toolbar";

const ACCEPTED_BANNER_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BANNER_SIZE_MB = 5;
const MAX_BANNER_SIZE_BYTES = MAX_BANNER_SIZE_MB * 1024 * 1024;

interface UseBannerUploadOptions {
  readonly supabase: SupabaseClient;
  readonly userId: string | null | undefined;
  readonly onSuccess: (publicUrl: string) => void;
  readonly onError: (message: string) => void;
  /** Optional prefix for the filename (e.g. "event_banner" or "news_banner"). */
  readonly filePrefix?: string;
}

interface UseBannerUploadResult {
  readonly handleBannerUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly isBannerUploading: boolean;
}

/**
 * Shared hook for uploading a banner image to Supabase Storage.
 * Validates file type and size before uploading.
 */
export function useBannerUpload({
  supabase,
  userId,
  onSuccess,
  onError,
  filePrefix = "banner",
}: UseBannerUploadOptions): UseBannerUploadResult {
  const [isBannerUploading, setIsBannerUploading] = useState(false);

  const handleBannerUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      if (!file || !userId) return;

      if (!ACCEPTED_BANNER_TYPES.includes(file.type)) {
        onError("Invalid file type. Use JPEG, PNG, GIF, or WebP.");
        return;
      }
      if (file.size > MAX_BANNER_SIZE_BYTES) {
        onError(`File too large. Maximum size is ${MAX_BANNER_SIZE_MB} MB.`);
        return;
      }

      setIsBannerUploading(true);
      const path = generateStoragePath(userId, `${filePrefix}_${file.name}`);
      const { error: uploadErr } = await supabase.storage.from(FORUM_IMAGES_BUCKET).upload(path, file);
      setIsBannerUploading(false);

      if (uploadErr) {
        onError(uploadErr.message);
        return;
      }
      const { data: urlData } = supabase.storage.from(FORUM_IMAGES_BUCKET).getPublicUrl(path);
      onSuccess(urlData.publicUrl);
    },
    [supabase, userId, onSuccess, onError, filePrefix],
  );

  return { handleBannerUpload, isBannerUploading };
}
