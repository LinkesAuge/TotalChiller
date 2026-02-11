import { z } from "zod";

/** UUID v4 validation for route params. */
export const uuidSchema = z.string().uuid("Invalid UUID format.");

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
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateFrom must be YYYY-MM-DD.")
    .optional()
    .default(""),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dateTo must be YYYY-MM-DD.")
    .optional()
    .default(""),
  player: z.string().max(100, "Player filter too long.").optional().default(""),
  source: z.string().max(100, "Source filter too long.").optional().default(""),
});

export type NotificationSettingsBody = z.infer<typeof notificationSettingsSchema>;
export type ChartQueryParams = z.infer<typeof chartQuerySchema>;
