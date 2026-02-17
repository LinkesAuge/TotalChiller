import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipientSummary } from "@/lib/types/domain";
import type { MessageProfileEntryDto, MessageProfileMapDto } from "@/lib/types/messages-api";

const PROFILE_LOOKUP_LIMIT = 200;
const PROFILE_SELECT = "id,username,display_name";

export interface MessageProfileRecord extends MessageProfileEntryDto {
  readonly id: string;
}

export function buildMessageProfileMap(profiles: readonly MessageProfileRecord[]): MessageProfileMapDto {
  const map: MessageProfileMapDto = {};
  for (const profile of profiles) {
    map[profile.id] = {
      username: profile.username,
      display_name: profile.display_name,
    };
  }
  return map;
}

export async function loadMessageProfilesByIds(
  supabase: SupabaseClient,
  profileIds: readonly string[],
  options?: { readonly limit?: number },
): Promise<MessageProfileMapDto> {
  const uniqueIds = Array.from(new Set(profileIds.filter((id): id is string => id.length > 0)));
  if (uniqueIds.length === 0) return {};

  const limit = options?.limit ?? PROFILE_LOOKUP_LIMIT;
  const { data } = await supabase.from("profiles").select(PROFILE_SELECT).in("id", uniqueIds.slice(0, limit));
  return buildMessageProfileMap((data ?? []) as MessageProfileRecord[]);
}

export function resolveMessageProfileLabel(
  profile: MessageProfileEntryDto | null | undefined,
  fallbackLabel: string,
): string {
  return profile?.display_name ?? profile?.username ?? fallbackLabel;
}

export function mapRecipientsWithProfiles(
  recipientIds: readonly string[],
  profilesById: MessageProfileMapDto,
  fallbackLabel: string,
): RecipientSummary[] {
  return recipientIds.map((recipientId) => {
    const profile = profilesById[recipientId];
    return {
      id: recipientId,
      label: resolveMessageProfileLabel(profile, fallbackLabel),
    };
  });
}
