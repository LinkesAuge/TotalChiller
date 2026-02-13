/**
 * Shared constants used across the application.
 *
 * Import individual constants rather than re-defining them locally.
 */

/** Matches a YYYY-MM-DD date string. */
export const DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;

/** Supabase storage bucket for forum and general media uploads. */
export const FORUM_IMAGES_BUCKET = "forum-images" as const;

/** Supabase storage bucket for message attachments. */
export const MESSAGE_IMAGES_BUCKET = "message-images" as const;
