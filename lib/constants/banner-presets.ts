/**
 * Shared banner preset definitions used by the BannerPicker component.
 * Consumed by events, announcements, and any future page with banner selection.
 */

/** A predefined banner image preset. */
export interface BannerPreset {
  readonly src: string;
  readonly label: string;
}

/** Full set of game-asset banner presets available across the site. */
export const BANNER_PRESETS: readonly BannerPreset[] = [
  { src: "/assets/game/banners/banner_ragnarok_clan_event_708x123.png", label: "Ragnarok Clan Event" },
  { src: "/assets/game/banners/banner_gold_dragon.png", label: "Gold Dragon" },
  { src: "/assets/game/banners/banner_tournir_kvk.png", label: "KvK Tournament" },
  { src: "/assets/game/banners/banner_tournir_throne.png", label: "Throne Tournament" },
  { src: "/assets/game/banners/banner_destruction.png", label: "Destruction" },
  { src: "/assets/game/banners/banner_chest.png", label: "Chest" },
  { src: "/assets/game/banners/banner_captain.png", label: "Captain" },
  { src: "/assets/game/banners/banner_doomsday_708.png", label: "Doomsday" },
  { src: "/assets/game/banners/banner_army_training.png", label: "Army Training" },
  { src: "/assets/game/banners/banner_caravan.png", label: "Caravan" },
  { src: "/assets/game/banners/banner_daily_job.png", label: "Daily Job" },
  { src: "/assets/game/banners/banner_equipment_creation.png", label: "Equipment Creation" },
  { src: "/assets/game/banners/banner_monster_kill.png", label: "Monster Kill" },
  { src: "/assets/game/banners/banner_medieval_scientist.png", label: "Medieval Scientist" },
  { src: "/assets/game/banners/banner_scientist.png", label: "Scientist" },
  { src: "/assets/game/banners/banner_plunderers_crypts.png", label: "Plunderers Crypts" },
  { src: "/assets/game/banners/banner_event_king_treasury.png", label: "King Treasury" },
  { src: "/assets/game/banners/banner_pvp_event_708x123.png", label: "PvP Event" },
  { src: "/assets/game/banners/banner_daily_pvp_708x123.png", label: "Daily PvP" },
  { src: "/assets/game/banners/banner_dragon_roulette_708x123.png", label: "Dragon Roulette" },
  { src: "/assets/game/banners/banner_dragon_roulette_pve_tournament_708x123.png", label: "Dragon Roulette PvE" },
  { src: "/assets/game/banners/banner_dragon_pve_tournament_clean_708x123.png", label: "Dragon PvE Tournament" },
  { src: "/assets/game/banners/banner_hellforge_708x123.png", label: "Hellforge" },
  { src: "/assets/game/banners/banner_hunt_day_708x123.png", label: "Hunt Day" },
  { src: "/assets/game/banners/banner_lucky_bazaar_708x123.png", label: "Lucky Bazaar" },
  { src: "/assets/game/banners/banner_lucky_pve_708x123.png", label: "Lucky PvE" },
  { src: "/assets/game/banners/banner_monster_hiring_708x123.png", label: "Monster Hiring" },
  { src: "/assets/game/banners/banner_oil_708x123.png", label: "Oil" },
  { src: "/assets/game/banners/banner_white_oil_708.png", label: "White Oil" },
  { src: "/assets/game/banners/banner_purple_rain_708x123.png", label: "Purple Rain" },
  { src: "/assets/game/banners/banner_ramzes_roulette_708x123.png", label: "Ramzes Roulette" },
  { src: "/assets/game/banners/banner_resource_collection_708x123.png", label: "Resource Collection" },
  { src: "/assets/game/banners/banner_silver_mountains_708x123.png", label: "Silver Mountains" },
  { src: "/assets/game/banners/banner_summon_event_708x123.png", label: "Summon Event" },
  { src: "/assets/game/banners/banner_vip_points_708x123.png", label: "VIP Points" },
  { src: "/assets/game/banners/banner_event_exchange_708.png", label: "Exchange Event" },
  { src: "/assets/game/banners/banner_event_resurrection_708x123.png", label: "Resurrection Event" },
  { src: "/assets/game/banners/banner_resurrection_708x123.png", label: "Resurrection" },
  { src: "/assets/game/banners/banner_offseason_event_708x123.png", label: "Offseason Event" },
  { src: "/assets/game/banners/banner_artifact_daily_pve_tournament_708x123.png", label: "Artifact PvE" },
  { src: "/assets/game/banners/banner_essences_immortal_pve_tournament_708x123.png", label: "Essences Immortal PvE" },
  { src: "/assets/game/banners/banner_clan_doom_monster_tournament_708x123.png", label: "Clan Doom Monster" },
  { src: "/assets/game/banners/banner_clandoom_prep_708x123.png", label: "Clan Doom Prep" },
  { src: "/assets/game/banners/banner_multistage_main_708x123.png", label: "Multistage Main" },
  { src: "/assets/game/banners/banner_multistage_basilisk_708x123.png", label: "Multistage Basilisk" },
  { src: "/assets/game/banners/banner_multistage_chimera_708x123.png", label: "Multistage Chimera" },
  { src: "/assets/game/banners/banner_multistage_crypt_708x123.png", label: "Multistage Crypt" },
  { src: "/assets/game/banners/banner_multistage_hundred_armed_708x123.png", label: "Multistage Hundred Armed" },
  { src: "/assets/game/banners/banner_multistage_mines_708x123.png", label: "Multistage Mines" },
  { src: "/assets/game/banners/banner_regular_battlepass_34_708x123.png", label: "Battle Pass 34" },
  { src: "/assets/game/banners/banner_regular_battlepass_46_708x123.png", label: "Battle Pass 46" },
];

/** Check whether a banner URL is a custom upload (not one of the given presets). */
export function isCustomBanner(url: string, presets: readonly BannerPreset[]): boolean {
  return url !== "" && !presets.some((preset) => preset.src === url);
}
