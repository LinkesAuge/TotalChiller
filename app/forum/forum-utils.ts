import createSupabaseBrowserClient from "@/lib/supabase/browser-client";

/** Translation function type (from next-intl useTranslations) */
export type TFunction = ReturnType<typeof import("next-intl").useTranslations>;

export function formatTimeAgo(dateStr: string, t: TFunction): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("hoursAgo", { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t("daysAgo", { count: diffDay });
}

/** Compute "hot" rank: log2(max(|score|,1)) + age_hours/6 for recency bias. */
export function computeHotRank(score: number, createdAt: string): number {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  const magnitude = Math.log2(Math.max(Math.abs(score), 1) + 1);
  const sign = score >= 0 ? 1 : -1;
  return sign * magnitude - ageHours / 6;
}

export async function resolveAuthorNames(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, display_name, username").in("id", unique);
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.display_name || row.username || "Unknown";
  }
  return map;
}
