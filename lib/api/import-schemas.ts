import { z } from "zod";

/* ── ChillerBuddy Export Payload (v1) ── */

const ChestItemSchema = z.object({
  chestName: z.string().min(1),
  playerName: z.string().min(1),
  source: z.string().min(1),
  level: z.string().nullable().optional(),
  openedAt: z.string().datetime(),
});

const MemberItemSchema = z.object({
  playerName: z.string().min(1),
  coordinates: z.string().nullable().optional(),
  score: z.number().int().nonnegative(),
  capturedAt: z.string().datetime(),
});

const EventItemSchema = z.object({
  playerName: z.string().min(1),
  eventPoints: z.number().int().nonnegative(),
  eventName: z.string().nullable().optional(),
  capturedAt: z.string().datetime(),
});

const ValidationListsSchema = z.object({
  knownPlayerNames: z.array(z.string()).optional(),
  knownChestNames: z.array(z.string()).optional(),
  knownSources: z.array(z.string()).optional(),
  corrections: z
    .object({
      player: z.record(z.string(), z.string()).optional(),
      chest: z.record(z.string(), z.string()).optional(),
      source: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export const ImportPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  source: z.string(),
  clan: z.object({
    localClanId: z.string(),
    name: z.string(),
    websiteClanId: z.string().uuid().nullable().optional(),
  }),
  data: z.object({
    chests: z.array(ChestItemSchema).optional(),
    members: z.array(MemberItemSchema).optional(),
    events: z.array(EventItemSchema).optional(),
  }),
  validationLists: ValidationListsSchema.optional(),
});

export type ImportPayload = z.infer<typeof ImportPayloadSchema>;
export type ChestItem = z.infer<typeof ChestItemSchema>;
export type MemberItem = z.infer<typeof MemberItemSchema>;
export type EventItem = z.infer<typeof EventItemSchema>;
export type ValidationLists = z.infer<typeof ValidationListsSchema>;

/* ── Submission Review ── */

const ReviewItemActionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
  matchGameAccountId: z.string().uuid().optional(),
  saveCorrection: z.boolean().optional(),
});

export const ReviewRequestSchema = z
  .object({
    action: z.enum(["approve_all", "reject_all", "approve_matched"]).optional(),
    items: z.array(ReviewItemActionSchema).optional(),
  })
  .refine((data) => data.action || (data.items && data.items.length > 0), {
    message: "Either 'action' (bulk) or 'items' (per-item) must be provided.",
  });

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;
export type ReviewItemAction = z.infer<typeof ReviewItemActionSchema>;

/* ── Validation List Push ── */

export const ValidationListPushSchema = z.object({
  clanId: z.string().uuid(),
  knownPlayerNames: z.array(z.string()).optional(),
  knownChestNames: z.array(z.string()).optional(),
  knownSources: z.array(z.string()).optional(),
  corrections: z
    .object({
      player: z.record(z.string(), z.string()).optional(),
      chest: z.record(z.string(), z.string()).optional(),
      source: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

export type ValidationListPush = z.infer<typeof ValidationListPushSchema>;

/* ── Query Param Schemas ── */

export const SubmissionsQuerySchema = z.object({
  clan_id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "partial"]).optional(),
  type: z.enum(["chests", "members", "events"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(50).default(20),
});

export const SubmissionDetailQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(50),
  item_status: z.enum(["pending", "approved", "rejected", "auto_matched"]).optional(),
});
