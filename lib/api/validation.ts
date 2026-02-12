import { z } from "zod";
import { DATE_REGEX } from "../constants";

/** UUID v4 validation for route params. */
export const uuidSchema = z.string().uuid("Invalid UUID format.");

/** Reusable Zod schema for a YYYY-MM-DD date string. */
export const dateStringSchema = z.string().regex(DATE_REGEX, "Must be YYYY-MM-DD.");

/** Notification settings PATCH body schema. */
export const notificationSettingsSchema = z
  .object({
    messages_enabled: z.boolean().optional(),
    news_enabled: z.boolean().optional(),
    events_enabled: z.boolean().optional(),
    system_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one setting must be provided.",
  });

/** Chart query params schema. */
export const chartQuerySchema = z.object({
  clanId: z.string().uuid("Invalid clanId format.").optional().default(""),
  gameAccountId: z.string().uuid("Invalid gameAccountId format.").optional().default(""),
  dateFrom: dateStringSchema.optional().default(""),
  dateTo: dateStringSchema.optional().default(""),
  player: z.string().max(100, "Player filter too long.").optional().default(""),
  source: z.string().max(100, "Source filter too long.").optional().default(""),
});

export type NotificationSettingsBody = z.infer<typeof notificationSettingsSchema>;
export type ChartQueryParams = z.infer<typeof chartQuerySchema>;
