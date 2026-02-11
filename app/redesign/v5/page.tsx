"use client";
import { VariantShell, ShellConfig } from "../variant-shell";

const A = "/assets/game";
const SIBLINGS = [
  { href: "/redesign/v1", label: "Home" },
  { href: "/redesign/v2", label: "Dashboard" },
  { href: "/redesign/v3", label: "News" },
  { href: "/redesign/v4", label: "Members" },
  { href: "/redesign/v6", label: "Forum" },
];

/**
 * V5 — Azure Events: Dark azure with a subtle teal undertone.
 * Dramatic crimson headers complement the event/tournament theme.
 */
const cfg: ShellConfig = {
  id: "v5",
  name: "Dark Azure — Events",
  pageType: "Veranstaltungen",
  activeNav: 4,
  palette: {
    bg: "#081420",
    bgGrad: "radial-gradient(ellipse at 30% 8%, #122838, #081420 70%)",
    sidebarTop: "#0a1630",
    sidebarBot: "#060e1e",
    gold: "#c8a050",
    gold2: "#dab860",
    headerGrad: "linear-gradient(180deg,#501820,#2c0e10)",
    surface: "rgba(8,20,34,0.9)",
  },
  assets: {
    heroBg: "backgrounds/preloader_background_default.png",
    heroFilter: "brightness(.2) saturate(.35)",
    drapery: "drapery/drapery_tir_capt_1.png",
    ornateFilter: "sepia(1) saturate(.3) hue-rotate(185deg) brightness(.7)",
    banner: "banners/banner_dragon_roulette_708x123.png",
  },
  siblings: SIBLINGS,
};

const EVENTS = [
  {
    title: "Ragnarök Season 12",
    status: "Aktiv",
    start: "10.02.2026",
    end: "17.02.2026",
    img: "banners/banner_ragnarok_clan_event_708x123.png",
    participants: 142,
    desc: "Clan-Wettbewerb um die meisten Event-Punkte. Top-3 Clans erhalten exklusive Belohnungen.",
  },
  {
    title: "Olympus-Turnier",
    status: "Aktiv",
    start: "08.02.2026",
    end: "15.02.2026",
    img: "banners/banner_tournir_kvk.png",
    participants: 88,
    desc: "3v3 Clan-Turnier mit KvU, THC und Lionhearts. Prüfungen von Olympus aktiv.",
  },
  {
    title: "Drachenjagd",
    status: "Geplant",
    start: "18.02.2026",
    end: "25.02.2026",
    img: "banners/banner_destruction.png",
    participants: 0,
    desc: "Kooperatives Event: Gemeinsam den Drachenboss besiegen für seltene Belohnungen.",
  },
  {
    title: "Truhen-Marathon",
    status: "Beendet",
    start: "01.02.2026",
    end: "07.02.2026",
    img: "banners/banner_chest.png",
    participants: 156,
    desc: "Wöchentlicher Truhen-Wettbewerb. Top-Sammler erhalten Bonus-Belohnungen.",
  },
];

export default function Page(): JSX.Element {
  return (
    <VariantShell config={cfg}>
      <div className="vs-content">
        <div className="vs-tabs">
          <div className="vs-tab act">Alle Events</div>
          <div className="vs-tab">Aktiv</div>
          <div className="vs-tab">Geplant</div>
          <div className="vs-tab">Beendet</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EVENTS.map((e) => (
            <div key={e.title} className="vs-card vs-card-hl">
              <div style={{ position: "relative", overflow: "hidden" }}>
                <img
                  src={`${A}/${e.img}`}
                  alt=""
                  style={{
                    width: "100%",
                    height: 95,
                    objectFit: "cover",
                    display: "block",
                    filter: "brightness(.42) saturate(.5)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, #081420a0 0%, transparent 100%)`,
                  }}
                />
                <div style={{ position: "absolute", bottom: 8, left: 14 }}>
                  <div
                    style={{
                      fontFamily: "Cinzel,serif",
                      fontSize: ".8rem",
                      color: "#c8a050",
                      textShadow: "0 1px 8px rgba(0,0,0,.8)",
                    }}
                  >
                    {e.title}
                  </div>
                </div>
                <div style={{ position: "absolute", top: 8, right: 10 }}>
                  <span
                    className={`vs-badge${e.status === "Aktiv" ? " vs-badge-gold" : e.status === "Beendet" ? " vs-badge-red" : " vs-badge-purple"}`}
                  >
                    {e.status}
                  </span>
                </div>
              </div>
              <div className="vs-cb">
                {e.desc}
                <div style={{ marginTop: 6, display: "flex", gap: 16, fontSize: ".62rem", color: "#5c5650" }}>
                  <span>Start: {e.start}</span>
                  <span>Ende: {e.end}</span>
                  {e.participants > 0 && <span style={{ color: "#c8a050" }}>{e.participants} Teilnehmer</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </VariantShell>
  );
}
