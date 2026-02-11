"use client";
import { VariantShell, ShellConfig } from "../variant-shell";

const SIBLINGS = [
  { href: "/redesign/v1", label: "Home" },
  { href: "/redesign/v2", label: "Dashboard" },
  { href: "/redesign/v3", label: "News" },
  { href: "/redesign/v4", label: "Members" },
  { href: "/redesign/v5", label: "Events" },
];

/**
 * V6 — Slate Navy Forum: Grey-blue tones with blue headers.
 * Softer contrast optimized for reading long discussion threads.
 */
const cfg: ShellConfig = {
  id: "v6",
  name: "Slate Navy — Forum",
  pageType: "Diskussionen",
  activeNav: 5,
  palette: {
    bg: "#0c1424",
    bgGrad: "radial-gradient(ellipse at 35% 8%, #162842, #0c1424 70%)",
    sidebarTop: "#0e1830",
    sidebarBot: "#0a1020",
    gold: "#c8a858",
    gold2: "#dcc070",
    headerGrad: "linear-gradient(180deg,#142640,#0c1c32)",
    text: "#dcd4c8",
    text2: "#a09888",
    navActiveBg: "rgba(26,48,80,0.35)",
  },
  assets: {
    heroBg: "backgrounds/preloader_background_default.png",
    heroFilter: "brightness(.18) saturate(.4)",
    drapery: "drapery/drapery_tir_hero_2.png",
    ornateFilter: "sepia(1) saturate(.3) hue-rotate(190deg) brightness(.7)",
    banner: "banners/banner_tournir_throne.png",
  },
  siblings: SIBLINGS,
};

const THREADS = [
  {
    title: "Ragnarök S12: Strategie-Diskussion",
    author: "Schmerztherapeuth",
    time: "vor 45min",
    replies: 28,
    pinned: true,
    cat: "Strategie",
  },
  { title: "Neue ROE-Regeln für K98", author: "Cerny", time: "vor 2h", replies: 15, pinned: true, cat: "Regeln" },
  {
    title: "Best Truhen-Build für Level 40+?",
    author: "DragonSlayer",
    time: "vor 4h",
    replies: 42,
    pinned: false,
    cat: "Guides",
  },
  {
    title: "Olympus-Turnier Ergebnisse",
    author: "IronFist",
    time: "vor 8h",
    replies: 19,
    pinned: false,
    cat: "Turnier",
  },
  {
    title: "Willkommen neue Mitglieder!",
    author: "Schmerztherapeuth",
    time: "vor 1d",
    replies: 7,
    pinned: false,
    cat: "Allgemein",
  },
  {
    title: "Armee-Zusammensetzung Tipps",
    author: "PhoenixRise",
    time: "vor 1d",
    replies: 33,
    pinned: false,
    cat: "Guides",
  },
  {
    title: "Nächstes Clan-Meeting: Sonntag 20 Uhr",
    author: "Cerny",
    time: "vor 2d",
    replies: 11,
    pinned: false,
    cat: "Allgemein",
  },
  {
    title: "Bug: Score wird nicht aktualisiert",
    author: "MoonKnight",
    time: "vor 3d",
    replies: 5,
    pinned: false,
    cat: "Support",
  },
];

export default function Page(): JSX.Element {
  return (
    <VariantShell config={cfg}>
      <div className="vs-content">
        <div className="vs-tabs">
          <div className="vs-tab act">Alle Threads</div>
          <div className="vs-tab">Strategie</div>
          <div className="vs-tab">Guides</div>
          <div className="vs-tab">Allgemein</div>
        </div>

        <div className="vs-card vs-card-hl">
          <div className="vs-ch">
            <span className="vs-ct">Diskussionen</span>
            <span style={{ marginLeft: "auto", fontSize: ".58rem", color: "#5c5650" }}>{THREADS.length} Threads</span>
          </div>
          <div style={{ padding: 0 }}>
            {THREADS.map((th) => (
              <div key={th.title} className="vs-li" style={{ padding: "10px 14px", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    {th.pinned && (
                      <span style={{ fontSize: ".48rem", color: "#c8a858", letterSpacing: ".06em", fontWeight: 600 }}>
                        PINNED
                      </span>
                    )}
                    <span style={{ fontFamily: "Cinzel,serif", fontSize: ".76rem", color: "#dcd4c8" }}>{th.title}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: ".6rem", color: "#5c5650" }}>
                    <span>
                      von <span style={{ color: "#a09888" }}>{th.author}</span>
                    </span>
                    <span>{th.time}</span>
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}
                >
                  <span
                    className={`vs-badge${th.cat === "Strategie" ? " vs-badge-red" : th.cat === "Guides" ? " vs-badge-purple" : ""}`}
                  >
                    {th.cat}
                  </span>
                  <span style={{ fontSize: ".58rem", color: "#5c5650" }}>{th.replies} Antworten</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </VariantShell>
  );
}
