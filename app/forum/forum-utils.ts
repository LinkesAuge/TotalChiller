import type { SupabaseClient } from "@supabase/supabase-js";

/** Translation function type (from next-intl useTranslations) */
export type TFunction = ReturnType<typeof import("next-intl").useTranslations>;

export { formatTimeAgo } from "@/lib/date-format";

/** Compute "hot" rank: log2(max(|score|,1)) + age_hours/6 for recency bias. */
export function computeHotRank(score: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const magnitude = Math.log2(Math.max(Math.abs(score), 1) + 1);
  const sign = score >= 0 ? 1 : -1;
  return sign * magnitude - ageHours / 6;
}

export async function resolveAuthorNames(supabase: SupabaseClient, userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, display_name, username").in("id", unique);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.display_name || row.username || "Unknown";
  }
  return map;
}
