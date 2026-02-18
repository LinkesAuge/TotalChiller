"use client";

import Image from "next/image";

/**
 * Maps logical icon names to optimized game asset paths under /assets/game/icons/.
 * Centralises all icon references so pages never hardcode asset paths.
 */
const ICON_MAP: Record<string, string> = {
  search: "/assets/game/icons/icons_spyglass_1.png",
  edit: "/assets/game/icons/icons_pen_2.png",
  add: "/assets/game/icons/icons_plus_3.png",
  settings: "/assets/game/icons/icons_options_gear_on_1.png",
  members: "/assets/game/icons/icons_player_3.png",
  membersGlow: "/assets/game/icons/icons_player_5.png",
  pin: "/assets/game/icons/icons_paper_add_2.png",
  star: "/assets/game/icons/icons_star_up_2.png",
  starSmall: "/assets/game/icons/icons_pve_star_small.png",
  news: "/assets/game/icons/icons_paper_saved_1.png",
  events: "/assets/game/icons/icons_main_menu_daily_1.png",
  power: "/assets/game/icons/icons_power.png",
  messages: "/assets/game/icons/widget_journal_spine.png",
  rank: "/assets/game/icons/icons_rang_over.png",
  help: "/assets/game/icons/icons_question_mark_1.png",
  warning: "/assets/game/icons/icons_paper_info_2.png",
  success: "/assets/game/icons/components_check_box_mark.png",
  error: "/assets/game/icons/icons_paper_cross_1.png",
  info: "/assets/game/icons/info_icon.png",
  home: "/assets/game/icons/icons_card_house_1.png",
  dashboard: "/assets/game/icons/icons_main_menu_workroom_1.png",
  analytics: "/assets/game/icons/icons_main_menu_rating_1.png",
  forum: "/assets/game/icons/icons_scroll_1.png",
  bugs: "/assets/game/icons/icons_skull_1.png",
  clan: "/assets/game/icons/icons_main_menu_clan_1.png",
  approvals: "/assets/game/icons/icons_check_1.png",
  logs: "/assets/game/icons/icons_log.png",
  army: "/assets/game/icons/icons_main_menu_army_1.png",
  envelope: "/assets/game/icons/icons_envelope_1.png",
};

const SIZE_PX: Record<GameIconSize, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};

type GameIconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface GameIconProps {
  /** Logical icon name (mapped to an asset path) or a raw path starting with `/`. */
  readonly name: string;
  /** Predefined size. Defaults to "md". */
  readonly size?: GameIconSize;
  /** Optional CSS class on the wrapper span. */
  readonly className?: string;
  /** Accessible alt text. Empty string for decorative icons. */
  readonly alt?: string;
}

/**
 * Renders a game asset icon at a consistent size with drop-shadow.
 * Accepts either a logical name (from ICON_MAP) or a raw asset path.
 */
export default function GameIcon({ name, size = "md", className, alt = "" }: GameIconProps): JSX.Element {
  const src = name.startsWith("/") ? name : ICON_MAP[name];
  const px = SIZE_PX[size];

  if (!src) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[GameIcon] Unknown icon name: "${name}"`);
    }
    return <span className={className} style={{ width: px, height: px, display: "inline-block" }} />;
  }

  return (
    <span className={`game-icon ${className ?? ""}`.trim()} style={{ width: px, height: px }}>
      <Image src={src} alt={alt} width={px} height={px} className="game-icon-img" />
    </span>
  );
}

export { ICON_MAP, SIZE_PX };
export type { GameIconSize, GameIconProps };
