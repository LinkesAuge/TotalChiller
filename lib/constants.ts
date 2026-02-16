/**
 * Shared constants used across the application.
 *
 * Import individual constants rather than re-defining them locally.
 */

/** Supabase storage bucket for forum and general media uploads. */
export const FORUM_IMAGES_BUCKET = "forum-images" as const;

/** Supabase storage bucket for message attachments. */
export const MESSAGE_IMAGES_BUCKET = "message-images" as const;

/** Supabase storage bucket for bug report screenshots. */
export const BUG_SCREENSHOTS_BUCKET = "bug-screenshots" as const;

/** Maximum number of screenshots per bug report. */
export const BUG_MAX_SCREENSHOTS = 5;

/** Maximum screenshot file size in bytes (5 MB). */
export const BUG_MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

/** Accepted MIME types for bug report screenshots. */
export const BUG_ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
