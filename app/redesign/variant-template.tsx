"use client";

/**
 * Shared variant page template v3.
 * - Ornate decorations tinted via CSS filter (no parchment brown)
 * - Banners integrated as section backgrounds with gradient overlays
 * - Asset showcase integrated naturally (no boxes)
 * - Support for purple-blue palette direction
 */

import React from "react";

const A = "/assets/game";

export interface VariantConfig {
  id: string;
  name: string;
  family: string;
  palette: {
    bg: string;
    bgGradient: string;
    surface: string;
    surfaceAlt: string;
    gold: string;
    gold2: string;
    /** Purple/indigo accent for subtle tints */
    purple: string;
    purpleDim: string;
    /** Red used sparingly */
    red: string;
    redDim: string;
    text: string;
    text2: string;
    muted: string;
    border: string;
    borderStrong: string;
    headerGrad: string;
    sidebarBg: string;
    sidebarBorder: string;
    navActiveBg: string;
    navActiveBorder: string;
    /** CSS filter to tint parchment ornaments to match palette */
    ornateFilter: string;
  };
  assets: {
    sidebarTex: string;
    heroBg: string;
    heroFilter: string;
    drapL: string;
    drapR: string;
    delimMain: string;
    delimSec: string;
    drapCard1: string;
    drapCard2: string;
    ribbon1: string;
    ribbon2: string;
    ornateCircle: string;
    ornateBand: string;
    headerTex: string;
    /** 3 banners used as section backgrounds */
    bannerA: string;
    bannerB: string;
    bannerC: string;
    progressBg: string;
    progressFill: string;
    progressBg2: string;
    progressFill2: string;
  };
  siblings: Array<{ href: string; label: string }>;
}

export function VariantPage({ config }: { config: VariantConfig }): JSX.Element {
  const p = config.palette;
  const a = config.assets;

  return (
    <>
      <style>{`
        .vp{--bg:${p.bg};--sf:${p.surface};--sfa:${p.surfaceAlt};--g:${p.gold};--g2:${p.gold2};--pu:${p.purple};--pud:${p.purpleDim};--rd:${p.red};--rdd:${p.redDim};--tx:${p.text};--t2:${p.text2};--mu:${p.muted};--bd:${p.border};--bds:${p.borderStrong};
          min-height:100vh;background:${p.bgGradient};color:var(--tx);font-family:'Crimson Text',Georgia,serif;display:flex}

        /* ─ sidebar ─ */
        .vp-sb{width:240px;height:100vh;flex-shrink:0;background:${p.sidebarBg};border-right:1px solid var(--bds);display:flex;flex-direction:column;position:sticky;top:0;overflow:hidden}
        .vp-sb-tex{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.05;mix-blend-mode:screen;pointer-events:none}
        .vp-sb-in{position:relative;z-index:1;padding:20px 16px;display:flex;flex-direction:column;height:100%;overflow-y:auto}
        .vp-logo-wrap{position:relative;width:90px;height:90px;margin:4px auto 8px}
        .vp-logo-ornate{position:absolute;inset:-16px;width:122px;height:122px;object-fit:contain;opacity:0.55;pointer-events:none;filter:${p.ornateFilter} drop-shadow(0 0 8px ${p.purple}40)}
        .vp-logo{width:90px;height:90px;border-radius:50%;overflow:hidden;border:1.5px solid var(--g);box-shadow:0 0 16px ${p.purple}30}
        .vp-logo img{width:100%;height:100%;object-fit:cover}
        .vp-clan{text-align:center;font-family:Cinzel,serif;font-size:.95rem;color:var(--g);margin-top:4px;letter-spacing:.05em}
        .vp-sub{text-align:center;font-size:.65rem;color:var(--t2);margin-bottom:16px;letter-spacing:.08em;text-transform:uppercase}
        .vp-sb-sep{width:80%;margin:0 auto;height:1px;background:linear-gradient(90deg,transparent,${p.border},transparent);opacity:.5}
        .vp-nl{font-family:Cinzel,serif;font-size:.5rem;color:var(--mu);text-transform:uppercase;letter-spacing:.14em;padding:0 10px;margin:16px 0 6px}
        .vp-ni{display:flex;align-items:center;gap:10px;padding:8px 14px;font-size:.8rem;color:var(--t2);border-left:2px solid transparent;cursor:pointer;transition:all .15s;letter-spacing:.02em}
        .vp-ni:hover{background:${p.navActiveBg};color:var(--g)}
        .vp-ni.act{background:${p.navActiveBg};border-left-color:${p.navActiveBorder};color:var(--g);font-weight:600}

        /* ─ main ─ */
        .vp-m{flex:1;min-width:0;overflow-x:hidden}

        /* ─ hero ─ */
        .vp-hero{position:relative;height:250px;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .vp-hero-bg{position:absolute;inset:0;background:url("${A}/${a.heroBg}") center/cover no-repeat;filter:${a.heroFilter}}
        .vp-hero-veil{position:absolute;inset:0;background:linear-gradient(180deg,${p.bg}30 0%,${p.bg}90 60%,${p.bg} 100%)}
        .vp-hero-drap{position:absolute;top:-14px;height:190px;opacity:.45;pointer-events:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
        .vp-hero-dl{left:30px;transform:scaleX(-1)}
        .vp-hero-dr{right:30px}
        .vp-hero-c{position:relative;z-index:1;text-align:center}
        .vp-hero h1{font-family:Cinzel,serif;font-size:2.3rem;color:var(--g);text-shadow:0 2px 20px rgba(0,0,0,.8),0 0 40px ${p.purple}18;letter-spacing:.03em;margin-bottom:2px}
        .vp-hero p{font-size:.75rem;color:var(--t2);letter-spacing:.18em;text-transform:uppercase;font-family:Cinzel,serif}

        /* ─ ornate band (tinted) ─ */
        .vp-ornate{width:100%;max-width:560px;max-height:20px;margin:0 auto;display:block;opacity:.3;object-fit:contain;filter:${p.ornateFilter}}

        /* ─ banner section (integrated as bg) ─ */
        .vp-ban-sec{position:relative;overflow:hidden;margin:0 24px;border:1px solid var(--bd);max-width:920px}
        .vp-ban-bg{width:100%;height:100px;object-fit:cover;display:block;filter:brightness(.6) saturate(.7)}
        .vp-ban-ov{position:absolute;inset:0;background:linear-gradient(90deg,${p.bg}dd 0%,${p.bg}88 40%,${p.bg}88 60%,${p.bg}dd 100%)}
        .vp-ban-txt{position:absolute;inset:0;display:flex;align-items:center;padding:0 24px}
        .vp-ban-txt h3{font-family:Cinzel,serif;font-size:.85rem;color:var(--g);letter-spacing:.06em;text-shadow:0 1px 6px rgba(0,0,0,.5)}
        .vp-ban-txt p{font-size:.72rem;color:var(--t2);margin-left:auto}

        /* ─ content grid ─ */
        .vp-g{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 24px;max-width:940px}
        .vp-full{grid-column:1/-1}

        /* ─ cards ─ */
        .vp-card{background:var(--sf);border:1px solid var(--bd);position:relative;overflow:hidden}
        .vp-card-hl{border-color:var(--bds)}
        .vp-ch{background:${p.headerGrad};padding:9px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--bd);position:relative;overflow:hidden}
        .vp-ch-tex{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.03;mix-blend-mode:screen;pointer-events:none}
        .vp-ch-drp{position:absolute;top:-8px;right:4px;height:46px;opacity:.2;pointer-events:none;filter:${p.ornateFilter} drop-shadow(0 2px 4px rgba(0,0,0,.4))}
        .vp-ct{font-family:Cinzel,serif;font-size:.76rem;color:var(--g);text-transform:uppercase;letter-spacing:.07em;position:relative;z-index:1}
        .vp-cb{padding:12px 14px;font-size:.8rem;color:var(--t2);line-height:1.65}

        /* ─ list items ─ */
        .vp-li{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid ${p.border}12;font-size:.78rem;color:var(--t2);transition:background .1s}
        .vp-li:last-child{border-bottom:none}
        .vp-li:hover{background:${p.purple}08}
        .vp-badge{margin-left:auto;padding:2px 9px;font-size:.56rem;font-weight:600;background:${p.purpleDim}30;color:${p.purple};border:1px solid ${p.purple}25;letter-spacing:.04em}

        /* ─ stats ─ */
        .vp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:${p.border}12}
        .vp-stat{background:var(--sf);padding:14px 6px;text-align:center}
        .vp-sv{font-family:'Fira Code',monospace;font-size:.95rem;color:var(--g)}
        .vp-sl{font-family:Cinzel,serif;font-size:.48rem;color:var(--mu);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}

        /* ─ table ─ */
        .vp-tbl{width:100%;border-collapse:collapse;font-size:.74rem}
        .vp-tbl thead{background:${p.headerGrad}}
        .vp-tbl th{padding:8px 12px;color:var(--g2);font-family:Cinzel,serif;text-transform:uppercase;letter-spacing:.06em;font-size:.62rem;text-align:left;border-bottom:1px solid var(--bd)}
        .vp-tbl td{padding:7px 12px;border-bottom:1px solid ${p.border}08;color:var(--t2)}
        .vp-tbl tbody tr:nth-child(even){background:var(--sfa)}

        /* ─ tabs ─ */
        .vp-tabs{display:flex;border-bottom:1px solid var(--bd);margin-bottom:12px}
        .vp-tab{padding:8px 20px;font-family:Cinzel,serif;font-size:.64rem;text-transform:uppercase;letter-spacing:.06em;color:var(--t2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s}
        .vp-tab.act{color:var(--g);border-bottom-color:var(--g)}

        /* ─ progress ─ */
        .vp-pr{position:relative;height:14px;overflow:hidden}
        .vp-pr-bg{position:absolute;inset:0}
        .vp-pr-fl{position:absolute;top:0;left:0;bottom:0}
        .vp-pr-bg img,.vp-pr-fl img{width:100%;height:100%;object-fit:fill}

        /* ─ news (banner as card bg) ─ */
        .vp-news{position:relative;overflow:hidden;border:1px solid var(--bds)}
        .vp-news-bg{width:100%;height:170px;object-fit:cover;display:block;filter:brightness(.5) saturate(.6)}
        .vp-news-ov{position:absolute;top:0;left:0;right:0;height:170px;background:linear-gradient(180deg,${p.bg}10 0%,${p.bg}cc 70%,${p.bg} 100%)}
        .vp-news-t{position:absolute;top:125px;left:16px;right:16px;font-family:Cinzel,serif;font-size:.9rem;color:var(--g);z-index:1;text-shadow:0 2px 8px rgba(0,0,0,.7)}
        .vp-news-b{padding:12px 16px;background:var(--sf);font-size:.78rem;color:var(--t2);line-height:1.55}

        /* ─ footer ─ */
        .vp-rib{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 0}
        .vp-rib img{height:24px;opacity:.4;filter:${p.ornateFilter}}
        .vp-rib span{font-family:Cinzel,serif;font-size:.78rem;color:var(--g);text-transform:uppercase;letter-spacing:.12em}
        .vp-deco-row{display:flex;gap:16px;padding:0 24px 12px;justify-content:center;align-items:center;opacity:.4}
        .vp-deco-row img{height:36px;filter:${p.ornateFilter}}
        .vp-ft{text-align:center;padding:18px 24px;font-size:.6rem;color:var(--mu);border-top:1px solid ${p.border}08;margin-top:8px}
        .vp-ft a{color:var(--g);text-decoration:none;margin:0 5px;font-size:.6rem;opacity:.7;transition:opacity .15s}
        .vp-ft a:hover{opacity:1}
      `}</style>

      <div className="vp">
        <aside className="vp-sb">
          <img className="vp-sb-tex" src={`${A}/${a.sidebarTex}`} alt="" />
          <div className="vp-sb-in">
            <div className="vp-logo-wrap">
              <img className="vp-logo-ornate" src={`${A}/decorations/${a.ornateCircle}`} alt="" />
              <div className="vp-logo">
                <img
                  src="/clan-logo.png"
                  alt="THC"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `${A}/decorations/components_shield_4.png`;
                  }}
                />
              </div>
            </div>
            <div className="vp-clan">[THC]</div>
            <div className="vp-sub">Chiller &amp; Killer</div>
            <div className="vp-sb-sep" />
            <div className="vp-nl">Navigation</div>
            {["Home", "Dashboard", "News", "Charts", "Events", "Forum", "Members"].map((item, i) => (
              <div key={item} className={`vp-ni${i === 0 ? " act" : ""}`}>
                {item}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div className="vp-sb-sep" />
          </div>
        </aside>

        <main className="vp-m">
          <div className="vp-hero">
            <div className="vp-hero-bg" />
            <div className="vp-hero-veil" />
            <img className="vp-hero-drap vp-hero-dl" src={`${A}/${a.drapL}`} alt="" />
            <img className="vp-hero-drap vp-hero-dr" src={`${A}/${a.drapR}`} alt="" />
            <div className="vp-hero-c">
              <h1>[THC] Chiller &amp; Killer</h1>
              <p>Koordiniert &middot; Wettbewerbsfähig &middot; Einladend</p>
            </div>
          </div>

          <div style={{ padding: "4px 24px" }}>
            <img className="vp-ornate" src={`${A}/decorations/${a.ornateBand}`} alt="" />
          </div>

          {/* Banner section A — integrated as background */}
          <div className="vp-ban-sec">
            <img className="vp-ban-bg" src={`${A}/${a.bannerA}`} alt="" />
            <div className="vp-ban-ov" />
            <div className="vp-ban-txt">
              <h3>Aktuelles Event</h3>
              <p>Ragnarök Season aktiv</p>
            </div>
          </div>

          <div className="vp-g">
            <div className="vp-card vp-card-hl">
              <div className="vp-ch">
                <img className="vp-ch-tex" src={`${A}/${a.headerTex}`} alt="" />
                <span className="vp-ct">Über uns</span>
                <img className="vp-ch-drp" src={`${A}/${a.drapCard1}`} alt="" />
              </div>
              <div className="vp-cb">
                Wir killen und chillen! Wir respektieren die ROE von K 98. Ihr möchtet in netter und entspannter
                Atmosphäre Total Battle spielen? Dann seid ihr hier herzlich willkommen!
                <div style={{ margin: "8px 0 4px" }}>
                  <img className="vp-ornate" src={`${A}/${a.delimSec}`} alt="" style={{ maxWidth: 280 }} />
                </div>
                <div style={{ fontSize: ".7rem", color: "var(--mu)" }}>
                  Garde Stufe 9+. Antike und Ragnarök Events verpflichtend.
                </div>
              </div>
            </div>

            <div className="vp-card">
              <div className="vp-ch">
                <img className="vp-ch-tex" src={`${A}/${a.headerTex}`} alt="" />
                <span className="vp-ct">Warum [THC] beitreten</span>
                <img className="vp-ch-drp" src={`${A}/${a.drapCard2}`} alt="" />
              </div>
              <div style={{ padding: 0 }}>
                {[
                  { t: "Wöchentliche Kriegskoordination", b: "Aktiv" },
                  { t: "Automatisiertes Truhen-Score-Tracking", b: "Einblicke" },
                  { t: "Interaktiver Veranstaltungskalender", b: "Kalender" },
                  { t: "Echtzeit-Clan-Nachrichten", b: "News" },
                  { t: "Diagramme und Analysen", b: "Analysen" },
                ].map((f) => (
                  <div key={f.t} className="vp-li">
                    <span>{f.t}</span>
                    <span className="vp-badge">{f.b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="vp-card vp-card-hl vp-full">
              <div className="vp-ch">
                <img className="vp-ch-tex" src={`${A}/${a.headerTex}`} alt="" />
                <span className="vp-ct">Clan Statistics</span>
              </div>
              <div style={{ padding: 0 }}>
                <div className="vp-stats">
                  {[
                    { v: "12,450", l: "Total Score" },
                    { v: "156", l: "Members" },
                    { v: "23", l: "Events" },
                    { v: "98.2%", l: "Win Rate" },
                    { v: "4,280", l: "Chests" },
                    { v: "K98", l: "Kingdom" },
                    { v: "Lv 42", l: "Avg Level" },
                    { v: "#3", l: "Rank" },
                  ].map((s) => (
                    <div key={s.l} className="vp-stat">
                      <div className="vp-sv">{s.v}</div>
                      <div className="vp-sl">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="vp-card">
              <div className="vp-ch">
                <img className="vp-ch-tex" src={`${A}/${a.headerTex}`} alt="" />
                <span className="vp-ct">Progress</span>
              </div>
              <div className="vp-cb" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { bg: a.progressBg, fill: a.progressFill, pct: 72, label: "Chest Progress" },
                  { bg: a.progressBg2, fill: a.progressFill2, pct: 45, label: "HP" },
                ].map((pr) => (
                  <div key={pr.label}>
                    <div
                      style={{
                        fontSize: ".56rem",
                        color: "var(--mu)",
                        marginBottom: 2,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{pr.label}</span>
                      <span>{pr.pct}%</span>
                    </div>
                    <div className="vp-pr">
                      <div className="vp-pr-bg">
                        <img src={`${A}/progress/${pr.bg}`} alt="" />
                      </div>
                      <div className="vp-pr-fl" style={{ width: `${pr.pct}%` }}>
                        <img src={`${A}/progress/${pr.fill}`} alt="" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="vp-card">
              <div className="vp-ch">
                <img className="vp-ch-tex" src={`${A}/${a.headerTex}`} alt="" />
                <span className="vp-ct">Top Members</span>
              </div>
              <div style={{ padding: 0 }}>
                <table className="vp-tbl">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Score</th>
                      <th>Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: "Schmerztherapeuth", s: "12,450", r: "Commander" },
                      { n: "DragonSlayer", s: "11,200", r: "Captain" },
                      { n: "IronFist", s: "9,800", r: "Lieutenant" },
                    ].map((row) => (
                      <tr key={row.n}>
                        <td style={{ color: "var(--tx)" }}>{row.n}</td>
                        <td style={{ fontFamily: "'Fira Code',monospace", color: "var(--g)" }}>{row.s}</td>
                        <td>{row.r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* News with banner B as background */}
            <div className="vp-news vp-full">
              <img className="vp-news-bg" src={`${A}/${a.bannerB}`} alt="" />
              <div className="vp-news-ov" />
              <div className="vp-news-t">Allianz-Turnier-Update und Ergebnisse</div>
              <div className="vp-news-b">
                Bleib informiert über das Geschehen in der Chiller &amp; Killer Community.
              </div>
            </div>

            <div className="vp-card vp-full">
              <div className="vp-ch">
                <img className="vp-ch-tex" src={`${A}/${a.headerTex}`} alt="" />
                <span className="vp-ct">Wie TotalChiller funktioniert</span>
              </div>
              <div className="vp-cb">
                <div className="vp-tabs">
                  <div className="vp-tab act">Übersicht</div>
                  <div className="vp-tab">Mitglieder</div>
                  <div className="vp-tab">Einstellungen</div>
                </div>
                <p style={{ color: "var(--t2)", lineHeight: 1.55 }}>
                  THC Ciller und Killer ist ein speziell entwickelter Community-Hub, der alles zusammenbringt.
                </p>
              </div>
            </div>
          </div>

          {/* Banner section C — integrated as background */}
          <div className="vp-ban-sec" style={{ marginTop: 8 }}>
            <img className="vp-ban-bg" src={`${A}/${a.bannerC}`} alt="" />
            <div className="vp-ban-ov" />
            <div className="vp-ban-txt">
              <h3>Community Events</h3>
              <p>Nächstes Event in 2 Tagen</p>
            </div>
          </div>

          <div className="vp-rib">
            <img src={`${A}/${a.ribbon1}`} alt="" />
            <span>{config.name}</span>
            <img src={`${A}/${a.ribbon2}`} alt="" />
          </div>

          {/* Decorative row — naturally blended, no boxes */}
          <div className="vp-deco-row">
            <img src={`${A}/decorations/backs_decoration_5.png`} alt="" />
            <img src={`${A}/${a.delimMain}`} alt="" style={{ height: 10, maxWidth: 200 }} />
            <img src={`${A}/decorations/backs_decoration_1.png`} alt="" />
          </div>

          <div className="vp-ft">
            [THC] Chiller &amp; Killer &bull; {config.name} ({config.family})
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

export default VariantPage;
