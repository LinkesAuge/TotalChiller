"use client";

import { useState } from "react";

/**
 * V1B: "Fortress Rampart" — Ornate sidebar with medallion icons and gold-trimmed sections.
 *
 * Collapsed = circular medallion icon buttons with gold borders.
 * Expanded = full ornate navigation with decorative section headers and ribbon-style separators.
 * The sidebar has a layered depth effect with leather/wood textures.
 */

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly active?: boolean;
  readonly badge?: number;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", active: true },
  { label: "News", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2", badge: 2 },
  { label: "Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { label: "Messages", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", badge: 5 },
  { label: "Charts", icon: "M18 20V10M12 20V4M6 20v-6" },
  { label: "Chest Database", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { label: "Data Import", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
  { label: "Admin", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

function RedesignV1BPage(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const w = isExpanded ? 260 : 72;

  return (
    <div style={st.page}>
      <style>{`
        @font-face { font-family: 'Fontin Sans'; src: url('/fonts/fontin_sans_cr_sc_regular.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .v1b-sidebar { transition: width 0.3s cubic-bezier(0.4,0,0.2,1); }
        .v1b-item:hover { background: linear-gradient(90deg, rgba(201,163,74,0.18), transparent); }
        .v1b-item:hover .v1b-medallion { border-color: #c9a34a; box-shadow: 0 0 10px rgba(201,163,74,0.25); }
        .v1b-item { transition: background 0.15s ease; }
        .v1b-content { transition: margin-left 0.3s cubic-bezier(0.4,0,0.2,1); }
        .v1b-expand:hover { border-color: #c9a34a; color: #e4c778; }
      `}</style>

      {/* === SIDEBAR === */}
      <aside className="v1b-sidebar" style={{ ...st.sidebar, width: w }}>
        {/* Header with clan banner */}
        <div style={st.sidebarHeader}>
          <div style={st.bannerWrap}>
            <img src="/assets/backgrounds/clan_background_3.png" alt="" style={st.bannerImg} />
            <div style={st.bannerOverlay} />
            <div style={st.bannerContent}>
              <img src="/assets/ui/components_shield_4.png" alt="" style={st.shieldIcon} />
              {isExpanded && (
                <div style={st.bannerText}>
                  <div style={st.bannerTitle}>The Chillers</div>
                  <div style={st.bannerSub}>Alpha Division</div>
                </div>
              )}
            </div>
          </div>
          {/* Gold trim line */}
          <div style={st.goldTrim}>
            <div style={st.goldTrimLine} />
            <img src="/assets/ui/components_decor_1.png" alt="" style={st.goldTrimDecor} />
            <div style={st.goldTrimLine} />
          </div>
        </div>

        {/* Navigation */}
        <nav style={st.nav}>
          {NAV_ITEMS.map((item, i) => {
            const isActive = Boolean(item.active);
            return (
              <a
                key={i}
                href="#"
                className="v1b-item"
                style={{
                  ...st.navItem,
                  ...(isActive ? st.navActive : {}),
                  padding: isExpanded ? "8px 14px" : "8px 0",
                  justifyContent: isExpanded ? "flex-start" : "center",
                }}
                title={!isExpanded ? item.label : undefined}
              >
                <div
                  className="v1b-medallion"
                  style={{
                    ...st.medallion,
                    ...(isActive ? st.medallionActive : {}),
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                </div>
                {isExpanded && <span style={st.navLabel}>{item.label}</span>}
                {item.badge && isExpanded && (
                  <span style={st.badge}>{item.badge}</span>
                )}
                {item.badge && !isExpanded && (
                  <span style={st.badgeDot} />
                )}
              </a>
            );
          })}
        </nav>

        {/* Expand toggle */}
        <div style={st.sidebarFooter}>
          <div style={st.footerTrim} />
          <button onClick={() => setIsExpanded(!isExpanded)} style={st.expandBtn} className="v1b-expand" aria-label="Toggle sidebar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {isExpanded ? <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /> : <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />}
            </svg>
            {isExpanded && <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Collapse</span>}
          </button>
          {/* User */}
          <div style={{ ...st.userArea, justifyContent: isExpanded ? "flex-start" : "center" }}>
            <div style={st.userAvatar}>DK</div>
            {isExpanded && (
              <div style={st.userText}>
                <div style={st.userN}>DragonKnight99</div>
                <div style={st.userR}>Officer</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* === CONTENT === */}
      <div className="v1b-content" style={{ ...st.content, marginLeft: w }}>
        {/* Top bar */}
        <header style={st.topBar}>
          <div style={st.topLeft}>
            <h1 style={st.topTitle}>Community Hub</h1>
            <span style={st.topSub}>Dashboard</span>
          </div>
          <div style={st.topRight}>
            <div style={st.bell}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span style={st.bellDot}>3</span>
            </div>
            <button style={st.ctaBtn}>New Post</button>
          </div>
        </header>

        {/* Hero */}
        <div style={st.hero}>
          <div style={st.heroOv} />
          <img src="/assets/banners/banner_gold_dragon.png" alt="" style={st.heroBg} />
          <div style={st.heroInner}>
            <img src="/assets/ui/decor_line_1.png" alt="" style={st.decor} />
            <h2 style={st.heroH}>Community Hub</h2>
            <p style={st.heroP}>Coordinated. Competitive. Welcoming.</p>
            <img src="/assets/ui/decor_line_1.png" alt="" style={{ ...st.decor, transform: "scaleY(-1)" }} />
          </div>
        </div>

        {/* Grid */}
        <div style={st.grid}>
          <section style={st.parchCard}>
            <div style={st.parchHead}><img src="/assets/ui/icon_swords.png" alt="" style={{ width: 20, height: 20, objectFit: "contain" as const }} /><h3 style={st.parchT}>Announcements</h3><span style={st.pin}>Pinned</span></div>
            <div style={st.parchBody}>
              {["War prep tonight at 21:00", "Chest upload deadline Friday", "Tournament registrations open"].map((t, i) => (
                <div key={i}>
                  {i > 0 && <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #b5a07a, transparent)" }} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", fontSize: "0.88rem", color: "#3a2a18" }}>
                    <span style={{ color: "#8a6d2f" }}>&#9733;</span><span style={{ flex: 1 }}>{t}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={st.gCard}>
            <div style={st.gHead}><h3 style={st.gT}>Quick Stats</h3></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "rgba(201,163,74,0.15)" }}>
              {[{ v: "12,450", l: "Personal Score" }, { v: "210,980", l: "Clan Score" }, { v: "78/90", l: "Chests" }, { v: "86%", l: "Readiness" }].map((s2, i) => (
                <div key={i} style={{ background: "rgba(10,21,32,0.8)", padding: "14px 10px", textAlign: "center" as const }}>
                  <div style={{ fontFamily: "'Fontin Sans', serif", fontSize: "1.2rem", fontWeight: 700, color: "#e4c778" }}>{s2.v}</div>
                  <div style={{ fontSize: "0.68rem", color: "#9a8b6f", marginTop: 2, textTransform: "uppercase" as const }}>{s2.l}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={st.dCard}>
            <div style={st.dHead}><h3 style={st.dT}>News Feed</h3></div>
            {["Recruitment opens this week", "Alliance update posted", "War highlights published"].map((t, i) => (
              <div key={i} style={{ padding: "10px 18px", borderBottom: "1px solid rgba(45,80,115,0.2)", fontSize: "0.88rem" }}>{t}</div>
            ))}
          </section>

          <section style={st.dCard}>
            <img src="/assets/banners/banner_ragnarok_clan_event_708x123.png" alt="" style={{ width: "100%", height: 60, objectFit: "cover" as const, opacity: 0.7 }} />
            <div style={{ padding: "12px 18px" }}>
              <h3 style={st.dT}>Events</h3>
              {[{ n: "War Prep", d: "Today 20:30", c: "#c94a3a" }, { n: "Guild Meeting", d: "Feb 5", c: "#4a6ea0" }].map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: "0.88rem" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: e.c }} />
                  <span style={{ flex: 1 }}>{e.n}</span>
                  <span style={{ fontSize: "0.72rem", color: "#9a8b6f" }}>{e.d}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer style={{ padding: "20px 28px", textAlign: "center" as const }}>
          <span style={{ color: "#5c5040", fontSize: "0.8rem" }}>The Chillers &bull; Community Hub</span>
        </footer>
      </div>

      <a href="/redesign" style={st.back}>&larr; Back to versions</a>
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Fontin Sans', 'Inter', serif", background: "#080d14", backgroundImage: "radial-gradient(ellipse at 30% 0%, #152238 0%, #0a1220 50%, #080d14 100%)", backgroundAttachment: "fixed", color: "#f2e6c9", minHeight: "100vh" },
  sidebar: { position: "fixed" as const, top: 0, left: 0, height: "100vh", background: "linear-gradient(180deg, #0e1a28 0%, #08111c 100%)", borderRight: "2px solid rgba(201,163,74,0.3)", boxShadow: "6px 0 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" as const, zIndex: 100, overflow: "hidden" },
  sidebarHeader: { flexShrink: 0 },
  bannerWrap: { position: "relative" as const, height: 80, overflow: "hidden" },
  bannerImg: { width: "100%", height: "100%", objectFit: "cover" as const, opacity: 0.4 },
  bannerOverlay: { position: "absolute" as const, inset: 0, background: "linear-gradient(180deg, rgba(14,26,40,0.5), rgba(8,17,28,0.95))" },
  bannerContent: { position: "absolute" as const, inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "0 12px" },
  shieldIcon: { width: 36, height: 36, objectFit: "contain" as const, flexShrink: 0, filter: "drop-shadow(0 0 8px rgba(228,199,120,0.3))" },
  bannerText: { overflow: "hidden", whiteSpace: "nowrap" as const },
  bannerTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "1.05rem", fontWeight: 700, color: "#e4c778", textShadow: "0 0 12px rgba(228,199,120,0.3)" },
  bannerSub: { fontSize: "0.68rem", color: "#9a8b6f" },
  goldTrim: { display: "flex", alignItems: "center", padding: "0 8px", gap: 4 },
  goldTrimLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.4), transparent)" },
  goldTrimDecor: { width: 16, height: 16, objectFit: "contain" as const, opacity: 0.5 },
  nav: { flex: 1, overflowY: "auto" as const, padding: "8px 8px", display: "flex", flexDirection: "column" as const, gap: 3 },
  navItem: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#7a6e5a", borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, position: "relative" as const, whiteSpace: "nowrap" as const, overflow: "hidden" },
  navActive: { color: "#e4c778", background: "linear-gradient(90deg, rgba(201,163,74,0.12), transparent)" },
  medallion: { width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(201,163,74,0.2)", background: "linear-gradient(180deg, rgba(15,26,40,0.8), rgba(8,17,28,0.9))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "inherit", transition: "all 0.15s" },
  medallionActive: { borderColor: "#c9a34a", background: "linear-gradient(180deg, rgba(201,163,74,0.15), rgba(138,109,47,0.08))", boxShadow: "0 0 10px rgba(201,163,74,0.2)" },
  navLabel: { overflow: "hidden", textOverflow: "ellipsis" },
  badge: { marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 9, background: "#c94a3a", color: "#fff", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" },
  badgeDot: { position: "absolute" as const, top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#c94a3a", border: "2px solid #0e1a28" },
  sidebarFooter: { flexShrink: 0, padding: "8px 8px 12px" },
  footerTrim: { height: 1, background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.3), transparent)", marginBottom: 8 },
  expandBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(201,163,74,0.2)", background: "rgba(201,163,74,0.04)", color: "#7a6e5a", cursor: "pointer", transition: "all 0.15s", marginBottom: 8 },
  userArea: { display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, overflow: "hidden" },
  userAvatar: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(180deg, rgba(201,163,74,0.25), rgba(138,109,47,0.15))", border: "2px solid #c9a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#e4c778", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 },
  userText: { overflow: "hidden", whiteSpace: "nowrap" as const },
  userN: { fontSize: "0.8rem", fontWeight: 600, color: "#f2e6c9" },
  userR: { fontSize: "0.68rem", color: "#7a6e5a" },
  content: { minHeight: "100vh" },
  topBar: { padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(201,163,74,0.15)" },
  topLeft: {},
  topTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "1.3rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  topSub: { fontSize: "0.78rem", color: "#7a6e5a" },
  topRight: { display: "flex", alignItems: "center", gap: 12 },
  bell: { position: "relative" as const, cursor: "pointer" },
  bellDot: { position: "absolute" as const, top: -5, right: -5, background: "#c94a3a", color: "#fff", fontSize: "0.55rem", fontWeight: 700, width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  ctaBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(201,163,74,0.5)", background: "linear-gradient(180deg, rgba(201,163,74,0.15), rgba(201,163,74,0.05))", color: "#e4c778", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" },
  hero: { position: "relative" as const, height: 140, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  heroOv: { position: "absolute" as const, inset: 0, background: "linear-gradient(180deg, rgba(8,13,20,0.3), rgba(8,13,20,0.85))", zIndex: 1 },
  heroBg: { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const, opacity: 0.5 },
  heroInner: { position: "relative" as const, zIndex: 2, textAlign: "center" as const, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 },
  decor: { width: 140, height: "auto", opacity: 0.5 },
  heroH: { fontFamily: "'Fontin Sans', serif", fontSize: "1.6rem", fontWeight: 700, color: "#e4c778", textTransform: "uppercase" as const, margin: 0, letterSpacing: "0.06em" },
  heroP: { fontSize: "0.82rem", color: "#9a8b6f", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: 0 },
  grid: { padding: "20px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  parchCard: { gridColumn: "span 2", background: "linear-gradient(180deg, #e8dcc4, #d8cab0)", border: "2px solid #b5a07a", borderRadius: 12, overflow: "hidden" },
  parchHead: { display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", background: "linear-gradient(180deg, #5a4325, #3d2d12)", borderBottom: "2px solid #8a6d2f" },
  parchT: { fontFamily: "'Fontin Sans', serif", fontSize: "0.95rem", fontWeight: 700, color: "#e4c778", flex: 1, margin: 0 },
  pin: { padding: "2px 8px", borderRadius: 14, background: "rgba(201,163,74,0.2)", border: "1px solid #c9a34a", color: "#e4c778", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const },
  parchBody: { padding: "10px 16px", color: "#3a3020" },
  gCard: { gridColumn: "span 2", background: "linear-gradient(180deg, rgba(22,44,66,0.95), rgba(14,30,45,0.95))", border: "2px solid rgba(201,163,74,0.5)", borderRadius: 12, overflow: "hidden" },
  gHead: { padding: "11px 16px", borderBottom: "1px solid rgba(201,163,74,0.3)" },
  gT: { fontFamily: "'Fontin Sans', serif", fontSize: "0.95rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  dCard: { background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))", border: "1px solid rgba(45,80,115,0.5)", borderRadius: 12, overflow: "hidden" },
  dHead: { padding: "11px 16px", borderBottom: "1px solid rgba(45,80,115,0.4)" },
  dT: { fontFamily: "'Fontin Sans', serif", fontSize: "0.9rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  back: { position: "fixed" as const, bottom: 20, right: 20, padding: "8px 16px", borderRadius: 8, background: "rgba(10,21,32,0.9)", border: "1px solid rgba(201,163,74,0.4)", color: "#e4c778", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, zIndex: 200 },
};

export default RedesignV1BPage;
