"use client";

/**
 * Shared variant shell — sidebar + hero header layout.
 * Each page supplies its own content as children and can override palette values.
 * Base: Night Abyss — BLUE dominant, gold from Total Battle game, purple as micro-accent only.
 */

import React from "react";

const A = "/assets/game";

/** Per-variant palette overrides — any key omitted falls back to the Night Abyss base. */
export interface PaletteOverrides {
  bg?: string;
  bgGrad?: string;
  surface?: string;
  surfaceAlt?: string;
  sidebarTop?: string;
  sidebarBot?: string;
  sidebarBorder?: string;
  gold?: string;
  gold2?: string;
  headerGrad?: string;
  text?: string;
  text2?: string;
  muted?: string;
  borderGold?: string;
  borderGoldStrong?: string;
  accentPurple?: string;
  navActiveBg?: string;
  navActiveHover?: string;
}

export interface ShellConfig {
  id: string;
  name: string;
  pageType: string;
  activeNav: number;
  palette?: PaletteOverrides;
  assets: {
    heroBg: string;
    heroFilter: string;
    drapery: string;
    ornateFilter: string;
    banner: string;
    sidebarTex?: string;
    ornateCircle?: string;
    ornateDivider?: string;
  };
  siblings: Array<{ href: string; label: string }>;
}

/* ── Night Abyss base palette — game-accurate blue dominant ── */
const BASE = {
  bg: "#0a1424",
  bgGrad: "radial-gradient(ellipse at 30% 8%, #142240, #0a1424 70%)",
  surface: "rgba(10,20,42,0.9)",
  surfaceAlt: "rgba(8,16,36,0.5)",
  sidebarTop: "#0c1832",
  sidebarBot: "#081020",
  sidebarBorder: "rgba(200,160,80,0.3)",
  gold: "#c8a050",
  gold2: "#e0b868",
  headerGrad: "linear-gradient(180deg,#4a1418,#280c0e)",
  text: "#e0d8cc",
  text2: "#9c9488",
  muted: "#5c5650",
  borderGold: "rgba(200,160,80,0.22)",
  borderGoldStrong: "rgba(200,160,80,0.42)",
  accentPurple: "#6a58a0",
  navActiveBg: "rgba(26,48,88,0.35)",
  navActiveHover: "rgba(26,48,88,0.25)",
};

export function VariantShell({ config, children }: { config: ShellConfig; children: React.ReactNode }): JSX.Element {
  const p = { ...BASE, ...config.palette };
  const a = config.assets;
  const NAV = ["Home", "Dashboard", "News", "Charts", "Events", "Forum", "Members"];
  const ornCircle = a.ornateCircle || "decorations/backs_decoration_34.png";
  const ornDiv = a.ornateDivider || "decorations/backs_decoration_25.png";
  const sbTex = a.sidebarTex || "backs/backs_technologies_1.png";

  return (
    <>
      <style>{`
        .vs{min-height:100vh;background:${p.bgGrad};color:${p.text};font-family:'Crimson Text',Georgia,serif;display:flex}

        /* ─ sidebar ─ */
        .vs-sb{width:244px;height:100vh;flex-shrink:0;background:linear-gradient(180deg,${p.sidebarTop},${p.sidebarBot});border-right:2px solid ${p.sidebarBorder};display:flex;flex-direction:column;position:sticky;top:0;overflow:hidden}
        .vs-sb-tex{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.04;mix-blend-mode:screen;pointer-events:none}
        .vs-sb-in{position:relative;z-index:1;padding:18px 14px;display:flex;flex-direction:column;height:100%;overflow-y:auto}

        /* clan logo with ornate frame */
        .vs-logo-w{position:relative;width:86px;height:86px;margin:6px auto 8px}
        .vs-logo-orn{position:absolute;inset:-18px;width:122px;height:122px;object-fit:contain;opacity:.55;pointer-events:none;filter:${a.ornateFilter} drop-shadow(0 0 10px ${p.gold}50)}
        .vs-logo{width:86px;height:86px;border-radius:50%;overflow:hidden;border:2px solid ${p.gold};box-shadow:0 0 16px rgba(0,0,0,.5),inset 0 0 8px rgba(0,0,0,.3)}
        .vs-logo img{width:100%;height:100%;object-fit:cover}
        .vs-clan{text-align:center;font-family:Cinzel,serif;font-size:.92rem;color:${p.gold};margin-top:6px;letter-spacing:.04em;text-shadow:0 1px 4px rgba(0,0,0,.5)}
        .vs-sub{text-align:center;font-size:.6rem;color:${p.text2};margin-bottom:16px;letter-spacing:.08em;text-transform:uppercase}
        .vs-sep{width:80%;margin:0 auto;height:1px;background:linear-gradient(90deg,transparent,${p.borderGold},transparent)}
        .vs-nl{font-family:Cinzel,serif;font-size:.48rem;color:${p.muted};text-transform:uppercase;letter-spacing:.14em;padding:0 8px;margin:16px 0 6px}
        .vs-ni{display:flex;align-items:center;gap:9px;padding:8px 12px;font-size:.78rem;color:${p.text2};border-left:2.5px solid transparent;cursor:pointer;transition:all .15s;letter-spacing:.02em}
        .vs-ni:hover{background:${p.navActiveHover};color:${p.gold}}
        .vs-ni.act{background:${p.navActiveBg};border-left-color:${p.gold};color:${p.gold};font-weight:600}

        /* ─ main ─ */
        .vs-m{flex:1;min-width:0;overflow-x:hidden}

        /* ─ hero ─ */
        .vs-hero{position:relative;height:210px;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .vs-hero-bg{position:absolute;inset:0;background:url("${A}/${a.heroBg}") center/cover no-repeat;filter:${a.heroFilter}}
        .vs-hero-veil{position:absolute;inset:0;background:linear-gradient(180deg,${p.bg}18 0%,${p.bg}80 50%,${p.bg} 100%)}
        .vs-hero-dr{position:absolute;top:-14px;height:170px;opacity:.45;pointer-events:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))}
        .vs-hero-dl{left:28px;transform:scaleX(-1)}.vs-hero-drr{right:28px}
        .vs-hero-c{position:relative;z-index:1;text-align:center}
        .vs-hero h1{font-family:Cinzel,serif;font-size:2.1rem;color:${p.gold};text-shadow:0 2px 18px rgba(0,0,0,.85),0 0 40px ${p.gold}18;letter-spacing:.04em;margin:0}
        .vs-hero p{font-size:.72rem;color:${p.text2};letter-spacing:.18em;text-transform:uppercase;font-family:Cinzel,serif;margin:5px 0 0}

        /* ─ ornate divider ─ */
        .vs-ornate{width:100%;max-width:520px;max-height:18px;margin:0 auto;display:block;opacity:.3;object-fit:contain;filter:${a.ornateFilter}}

        /* ─ event banner bar ─ */
        .vs-ban{position:relative;overflow:hidden;margin:4px 20px 10px;border:1.5px solid ${p.borderGold};max-width:920px}
        .vs-ban>img{width:100%;height:80px;object-fit:cover;display:block;filter:brightness(.5) saturate(.55)}
        .vs-ban-ov{position:absolute;inset:0;background:linear-gradient(90deg,${p.bg}cc 0%,${p.bg}60 40%,${p.bg}60 60%,${p.bg}cc 100%)}
        .vs-ban-t{position:absolute;inset:0;display:flex;align-items:center;padding:0 20px}
        .vs-ban-t h3{font-family:Cinzel,serif;font-size:.8rem;color:${p.gold};letter-spacing:.06em}
        .vs-ban-t span{font-size:.66rem;color:${p.text2};margin-left:auto}

        /* ─ card system ─ */
        .vs-card{background:${p.surface};border:1.5px solid ${p.borderGold};overflow:hidden}
        .vs-card-hl{border-color:${p.borderGoldStrong};box-shadow:0 2px 12px rgba(0,0,0,.2)}
        .vs-ch{background:${p.headerGrad};padding:9px 14px;display:flex;align-items:center;gap:7px;border-bottom:1.5px solid ${p.borderGold};position:relative}
        .vs-ct{font-family:Cinzel,serif;font-size:.74rem;color:${p.gold2};text-transform:uppercase;letter-spacing:.07em;text-shadow:0 1px 3px rgba(0,0,0,.5)}
        .vs-cb{padding:12px 14px;font-size:.78rem;color:${p.text2};line-height:1.6}
        .vs-li{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid rgba(200,160,80,.06);font-size:.76rem;color:${p.text2};transition:background .1s}
        .vs-li:last-child{border-bottom:none}
        .vs-li:hover{background:rgba(26,48,88,.14)}

        /* badges */
        .vs-badge{margin-left:auto;padding:2px 8px;font-size:.54rem;font-weight:600;background:rgba(26,48,88,.2);color:#4a7aaa;border:1px solid rgba(26,48,88,.35);letter-spacing:.03em}
        .vs-badge-red{background:rgba(120,32,32,.15);color:#c84444;border-color:rgba(120,32,32,.25)}
        .vs-badge-purple{background:rgba(80,60,140,.1);color:${p.accentPurple};border-color:rgba(80,60,140,.18)}
        .vs-badge-gold{background:rgba(200,160,80,.1);color:${p.gold};border-color:rgba(200,160,80,.25)}

        /* stats grid */
        .vs-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(200,160,80,.06)}
        .vs-stat{background:${p.surface};padding:14px 6px;text-align:center}
        .vs-sv{font-family:'Fira Code',monospace;font-size:.92rem;color:${p.gold}}
        .vs-sl{font-family:Cinzel,serif;font-size:.47rem;color:${p.muted};text-transform:uppercase;letter-spacing:.06em;margin-top:3px}

        /* tables */
        .vs-tbl{width:100%;border-collapse:collapse;font-size:.72rem}
        .vs-tbl thead{background:${p.headerGrad}}
        .vs-tbl th{padding:8px 12px;color:${p.gold2};font-family:Cinzel,serif;text-transform:uppercase;letter-spacing:.05em;font-size:.6rem;text-align:left;border-bottom:1.5px solid ${p.borderGold}}
        .vs-tbl td{padding:7px 12px;border-bottom:1px solid rgba(200,160,80,.05);color:${p.text2}}
        .vs-tbl tbody tr:nth-child(even){background:${p.surfaceAlt}}
        .vs-tbl tbody tr:hover{background:rgba(26,48,88,.12)}

        /* tabs */
        .vs-tabs{display:flex;border-bottom:1.5px solid ${p.borderGold};margin-bottom:12px}
        .vs-tab{padding:8px 18px;font-family:Cinzel,serif;font-size:.6rem;text-transform:uppercase;letter-spacing:.06em;color:${p.text2};cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1.5px;transition:all .15s}
        .vs-tab.act{color:${p.gold};border-bottom-color:${p.gold}}

        /* progress bars */
        .vs-pr{position:relative;height:16px;overflow:hidden}
        .vs-pr-bg{position:absolute;inset:0}.vs-pr-fl{position:absolute;top:0;left:0;bottom:0}
        .vs-pr-bg img,.vs-pr-fl img{width:100%;height:100%;object-fit:fill}

        /* content area */
        .vs-content{padding:12px 20px;max-width:940px}
        .vs-g{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .vs-full{grid-column:1/-1}

        /* footer */
        .vs-ft{text-align:center;padding:18px 20px;font-size:.58rem;color:${p.muted};border-top:1px solid rgba(200,160,80,.06);margin-top:14px}
        .vs-ft a{color:${p.gold};text-decoration:none;margin:0 5px;font-size:.58rem;opacity:.6;transition:opacity .15s}
        .vs-ft a:hover{opacity:1}
      `}</style>

      <div className="vs">
        <aside className="vs-sb">
          <img className="vs-sb-tex" src={`${A}/${sbTex}`} alt="" />
          <div className="vs-sb-in">
            <div className="vs-logo-w">
              <img className="vs-logo-orn" src={`${A}/${ornCircle}`} alt="" />
              <div className="vs-logo">
                <img
                  src="/clan-logo.png"
                  alt="THC"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${A}/decorations/components_shield_4.png`;
                  }}
                />
              </div>
            </div>
            <div className="vs-clan">[THC]</div>
            <div className="vs-sub">Chiller &amp; Killer</div>
            <div className="vs-sep" />
            <div className="vs-nl">Navigation</div>
            {NAV.map((item, i) => (
              <div key={item} className={`vs-ni${i === config.activeNav ? " act" : ""}`}>
                {item}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div className="vs-sep" />
          </div>
        </aside>

        <main className="vs-m">
          <div className="vs-hero">
            <div className="vs-hero-bg" />
            <div className="vs-hero-veil" />
            <img className="vs-hero-dr vs-hero-dl" src={`${A}/${a.drapery}`} alt="" />
            <img className="vs-hero-dr vs-hero-drr" src={`${A}/${a.drapery}`} alt="" />
            <div className="vs-hero-c">
              <h1>[THC] Chiller &amp; Killer</h1>
              <p>{config.pageType}</p>
            </div>
          </div>
          <div style={{ padding: "4px 20px" }}>
            <img className="vs-ornate" src={`${A}/${ornDiv}`} alt="" />
          </div>
          <div className="vs-ban">
            <img src={`${A}/${a.banner}`} alt="" />
            <div className="vs-ban-ov" />
            <div className="vs-ban-t">
              <h3>Aktuelles Event</h3>
              <span>Ragnarök Season aktiv</span>
            </div>
          </div>

          {children}

          <div className="vs-ft">
            [THC] Chiller &amp; Killer &bull; {config.name}
            <div style={{ marginTop: 5 }}>
              <a href="/redesign">Showcase</a>
              {config.siblings.map((s) => (
                <a key={s.href} href={s.href}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default VariantShell;
