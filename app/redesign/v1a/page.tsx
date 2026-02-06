"use client";

import { useState } from "react";

/**
 * V1A: "Fortress Keep" — Classic Discord-style icon rail sidebar.
 *
 * Collapsed = narrow icon strip with circular icon buttons (like Discord servers).
 * Expanded = icon + text labels with section groups. Gold dividers between sections.
 * Sidebar has a dark leather feel with gold trim.
 */

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly active?: boolean;
  readonly badge?: number;
}

interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", active: true },
      { label: "News", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2", badge: 2 },
      { label: "Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
      { label: "Messages", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", badge: 5 },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "Charts", icon: "M18 20V10M12 20V4M6 20v-6" },
      { label: "Chest Database", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
      { label: "Data Import", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Admin Panel", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
      { label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
      { label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
    ],
  },
];

function NavIcon({ d, size = 20 }: { readonly d: string; readonly size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function RedesignV1APage(): JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const sidebarWidth = isExpanded ? 240 : 68;

  return (
    <div style={s.page}>
      <style>{`
        @font-face { font-family: 'Fontin Sans'; src: url('/fonts/fontin_sans_cr_sc_regular.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .v1a-sidebar { transition: width 0.25s cubic-bezier(0.4,0,0.2,1); }
        .v1a-nav-item:hover { background: rgba(201,163,74,0.12); border-color: rgba(201,163,74,0.3); color: #e4c778; }
        .v1a-nav-item { transition: all 0.15s ease; }
        .v1a-content { transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1); }
        .v1a-toggle:hover { background: rgba(201,163,74,0.15); color: #e4c778; }
      `}</style>

      {/* === SIDEBAR === */}
      <aside className="v1a-sidebar" style={{ ...s.sidebar, width: sidebarWidth }}>
        {/* Clan emblem + toggle */}
        <div style={s.sidebarTop}>
          <div style={s.emblemRow}>
            <img src="/assets/ui/components_shield_4.png" alt="" style={s.emblem} />
            {isExpanded && <span style={s.clanName}>The Chillers</span>}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={s.toggleBtn}
            className="v1a-toggle"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isExpanded
                ? <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                : <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />}
            </svg>
          </button>
        </div>

        {/* Nav sections */}
        <nav style={s.nav}>
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} style={s.navSection}>
              {isExpanded && <div style={s.sectionTitle}>{section.title}</div>}
              {!isExpanded && si > 0 && <div style={s.sectionDivider} />}
              {section.items.map((item, ii) => (
                <a
                  key={ii}
                  href="#"
                  className="v1a-nav-item"
                  style={{
                    ...s.navItem,
                    ...(item.active ? s.navItemActive : {}),
                    justifyContent: isExpanded ? "flex-start" : "center",
                    padding: isExpanded ? "10px 14px" : "10px 0",
                  }}
                  title={!isExpanded ? item.label : undefined}
                >
                  <span style={{ ...s.navIcon, color: item.active ? "#e4c778" : "#7a6e5a" }}>
                    <NavIcon d={item.icon} />
                  </span>
                  {isExpanded && <span style={s.navLabel}>{item.label}</span>}
                  {item.badge && (
                    <span style={{ ...s.badge, ...(isExpanded ? {} : s.badgeCollapsed) }}>{item.badge}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* User section at bottom */}
        <div style={s.sidebarBottom}>
          <div style={s.userRow}>
            <div style={s.userAvatar}>DK</div>
            {isExpanded && (
              <div style={s.userInfo}>
                <div style={s.userName}>DragonKnight99</div>
                <div style={s.userRole}>Officer</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <div className="v1a-content" style={{ ...s.main, marginLeft: sidebarWidth }}>
        {/* Top bar */}
        <header style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Community Hub</h1>
            <span style={s.pageSub}>The Chillers Alpha &bull; Dashboard</span>
          </div>
          <div style={s.topActions}>
            <div style={s.notifBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span style={s.notifDot}>3</span>
            </div>
            <button style={s.goldBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Post
            </button>
          </div>
        </header>

        {/* Hero */}
        <section style={s.hero}>
          <div style={s.heroOverlay} />
          <img src="/assets/banners/banner_gold_dragon.png" alt="" style={s.heroBg} />
          <div style={s.heroContent}>
            <img src="/assets/ui/decor_line_1.png" alt="" style={s.decorLine} />
            <h2 style={s.heroTitle}>Community Hub</h2>
            <p style={s.heroSub}>Coordinated. Competitive. Welcoming.</p>
            <img src="/assets/ui/decor_line_1.png" alt="" style={{ ...s.decorLine, transform: "scaleY(-1)" }} />
          </div>
        </section>

        {/* Content Grid */}
        <div style={s.grid}>
          {/* Announcements */}
          <section style={s.parchmentCard}>
            <div style={s.parchmentHead}>
              <img src="/assets/ui/icon_swords.png" alt="" style={s.cardIcon} />
              <h3 style={s.parchmentTitle}>Announcements</h3>
              <span style={s.pinnedBadge}>Pinned</span>
            </div>
            <div style={s.parchmentBody}>
              {[
                { text: "War prep tonight at 21:00 — full attendance required", tag: "Priority", color: "#c94a3a" },
                { text: "Chest upload deadline this Friday", tag: "Info", color: "#4a6ea0" },
                { text: "Alliance tournament registrations open", tag: "New", color: "#4a9960" },
              ].map((item, i) => (
                <div key={i}>
                  {i > 0 && <div style={s.divider} />}
                  <div style={s.parchmentItem}>
                    <span style={s.parchmentDot}>&#9733;</span>
                    <span>{item.text}</span>
                    <span style={{ ...s.itemBadge, background: `linear-gradient(180deg, ${item.color}, ${item.color}cc)` }}>{item.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section style={s.goldCard}>
            <div style={s.goldHead}>
              <img src="/assets/ui/icons_chest_1.png" alt="" style={s.cardIcon} />
              <h3 style={s.goldTitle}>Quick Stats</h3>
            </div>
            <div style={s.statsGrid}>
              {[
                { value: "12,450", label: "Personal Score" },
                { value: "210,980", label: "Clan Score" },
                { value: "78/90", label: "Chest Submissions" },
                { value: "86%", label: "Event Readiness" },
              ].map((stat, i) => (
                <div key={i} style={s.statBox}>
                  <div style={s.statVal}>{stat.value}</div>
                  <div style={s.statLbl}>{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* News */}
          <section style={s.darkCard}>
            <div style={s.darkHead}><h3 style={s.darkTitle}>News Feed</h3></div>
            <div>
              {[
                { title: "Recruitment window opens this week", time: "2h ago" },
                { title: "Alliance update posted by leadership", time: "5h ago" },
                { title: "War report and highlights published", time: "1d ago" },
              ].map((item, i) => (
                <div key={i} style={s.newsRow}>
                  <div><div style={{ fontSize: "0.9rem" }}>{item.title}</div><div style={{ fontSize: "0.75rem", color: "#5c5040" }}>{item.time}</div></div>
                </div>
              ))}
            </div>
          </section>

          {/* Events */}
          <section style={s.darkCard}>
            <img src="/assets/banners/banner_ragnarok_clan_event_708x123.png" alt="" style={s.eventBanner} />
            <div style={{ padding: "14px 20px" }}>
              <h3 style={s.darkTitle}>Upcoming Events</h3>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 12 }}>
                {[
                  { name: "War Prep", date: "Today 20:30", color: "#c94a3a" },
                  { name: "Guild Meeting", date: "Feb 5, 19:00", color: "#4a6ea0" },
                  { name: "Training Night", date: "Feb 18, 21:00", color: "#4a9960" },
                ].map((ev, i) => (
                  <div key={i} style={s.eventRow}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{ev.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#9a8b6f", fontWeight: 600 }}>{ev.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Progress */}
          <section style={{ ...s.darkCard, gridColumn: "span 2" }}>
            <div style={s.darkHead}><h3 style={s.darkTitle}>Clan Progress</h3></div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column" as const, gap: 16 }}>
              {[
                { label: "Weekly Chest Target", value: 87, color: "#c9a34a" },
                { label: "Event Participation", value: 72, color: "#4a9960" },
                { label: "Member Activity", value: 94, color: "#4a6ea0" },
              ].map((bar, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#9a8b6f", marginBottom: 6 }}>
                    <span>{bar.label}</span>
                    <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(10,21,32,0.6)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, width: `${bar.value}%`, background: `linear-gradient(90deg, ${bar.color}88, ${bar.color})` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer style={s.footer}>
          <span style={{ color: "#5c5040", fontSize: "0.8rem" }}>The Chillers &bull; Community Hub &bull; Total Battle Clan Platform</span>
        </footer>
      </div>

      <a href="/redesign" style={s.backLink}>&larr; Back to versions</a>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { fontFamily: "'Fontin Sans', 'Inter', serif", background: "#080d14", backgroundImage: "radial-gradient(ellipse at 30% 0%, #152238 0%, #0a1220 50%, #080d14 100%)", backgroundAttachment: "fixed", color: "#f2e6c9", minHeight: "100vh", display: "flex" },
  sidebar: { position: "fixed" as const, top: 0, left: 0, height: "100vh", background: "linear-gradient(180deg, rgba(10,18,28,0.98), rgba(6,12,20,0.99))", borderRight: "2px solid rgba(201,163,74,0.35)", boxShadow: "4px 0 24px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column" as const, zIndex: 100, overflow: "hidden" },
  sidebarTop: { padding: "16px 12px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottom: "1px solid rgba(201,163,74,0.2)", flexShrink: 0 },
  emblemRow: { display: "flex", alignItems: "center", gap: 10, overflow: "hidden" },
  emblem: { width: 32, height: 32, objectFit: "contain" as const, flexShrink: 0 },
  clanName: { fontFamily: "'Fontin Sans', serif", fontSize: "1rem", fontWeight: 700, color: "#e4c778", letterSpacing: "0.03em", textShadow: "0 0 16px rgba(228,199,120,0.3)", whiteSpace: "nowrap" as const },
  toggleBtn: { width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(201,163,74,0.25)", background: "rgba(201,163,74,0.06)", color: "#7a6e5a", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" },
  nav: { flex: 1, overflowY: "auto" as const, padding: "8px 8px" },
  navSection: { marginBottom: 8 },
  sectionTitle: { fontSize: "0.65rem", fontWeight: 700, color: "#5c5040", textTransform: "uppercase" as const, letterSpacing: "0.1em", padding: "8px 10px 4px", whiteSpace: "nowrap" as const },
  sectionDivider: { height: 1, background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.25), transparent)", margin: "6px 8px" },
  navItem: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#9a8b6f", borderRadius: 8, border: "1px solid transparent", fontSize: "0.85rem", fontWeight: 500, position: "relative" as const, whiteSpace: "nowrap" as const, overflow: "hidden" },
  navItemActive: { background: "linear-gradient(90deg, rgba(201,163,74,0.15), transparent)", borderColor: "rgba(201,163,74,0.35)", color: "#e4c778", borderLeftWidth: 3, borderLeftColor: "#c9a34a", boxShadow: "0 0 12px rgba(201,163,74,0.1)" },
  navIcon: { width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navLabel: { overflow: "hidden", textOverflow: "ellipsis" },
  badge: { marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 9, background: "#c94a3a", color: "#fff", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", flexShrink: 0 },
  badgeCollapsed: { position: "absolute" as const, top: 4, right: 4, marginLeft: 0 },
  sidebarBottom: { padding: "12px", borderTop: "1px solid rgba(201,163,74,0.2)", flexShrink: 0 },
  userRow: { display: "flex", alignItems: "center", gap: 10, overflow: "hidden" },
  userAvatar: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(180deg, rgba(201,163,74,0.25), rgba(138,109,47,0.15))", border: "2px solid #c9a34a", display: "flex", alignItems: "center", justifyContent: "center", color: "#e4c778", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 },
  userInfo: { overflow: "hidden", whiteSpace: "nowrap" as const },
  userName: { fontSize: "0.82rem", fontWeight: 600, color: "#f2e6c9" },
  userRole: { fontSize: "0.7rem", color: "#7a6e5a" },
  main: { flex: 1, minHeight: "100vh" },
  topBar: { padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(201,163,74,0.15)" },
  pageTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "1.3rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  pageSub: { fontSize: "0.8rem", color: "#7a6e5a" },
  topActions: { display: "flex", alignItems: "center", gap: 12 },
  notifBtn: { position: "relative" as const, cursor: "pointer" },
  notifDot: { position: "absolute" as const, top: -5, right: -5, background: "#c94a3a", color: "#fff", fontSize: "0.55rem", fontWeight: 700, width: 15, height: 15, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  goldBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(201,163,74,0.5)", background: "linear-gradient(180deg, rgba(201,163,74,0.15), rgba(201,163,74,0.05))", color: "#e4c778", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" },
  hero: { position: "relative" as const, height: 160, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  heroOverlay: { position: "absolute" as const, inset: 0, background: "linear-gradient(180deg, rgba(8,13,20,0.3), rgba(8,13,20,0.85))", zIndex: 1 },
  heroBg: { position: "absolute" as const, inset: 0, width: "100%", height: "100%", objectFit: "cover" as const, opacity: 0.5 },
  heroContent: { position: "relative" as const, zIndex: 2, textAlign: "center" as const, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 },
  decorLine: { width: 160, height: "auto", opacity: 0.5 },
  heroTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "1.8rem", fontWeight: 700, color: "#e4c778", letterSpacing: "0.06em", textShadow: "0 2px 16px rgba(201,163,74,0.4)", textTransform: "uppercase" as const, margin: 0 },
  heroSub: { fontSize: "0.85rem", color: "#9a8b6f", letterSpacing: "0.1em", textTransform: "uppercase" as const, margin: 0 },
  grid: { padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  parchmentCard: { gridColumn: "span 2", background: "linear-gradient(180deg, #e8dcc4, #d8cab0)", border: "2px solid #b5a07a", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  parchmentHead: { display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "linear-gradient(180deg, #5a4325, #3d2d12)", borderBottom: "2px solid #8a6d2f" },
  cardIcon: { width: 22, height: 22, objectFit: "contain" as const },
  parchmentTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "1rem", fontWeight: 700, color: "#e4c778", flex: 1, margin: 0 },
  pinnedBadge: { padding: "3px 10px", borderRadius: 16, background: "rgba(201,163,74,0.2)", border: "1px solid #c9a34a", color: "#e4c778", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase" as const },
  parchmentBody: { padding: "12px 18px", color: "#3a3020" },
  parchmentItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: "0.88rem", color: "#3a2a18" },
  parchmentDot: { color: "#8a6d2f", fontSize: "1rem", width: 20, textAlign: "center" as const },
  divider: { height: 1, background: "linear-gradient(90deg, transparent, #b5a07a, transparent)" },
  itemBadge: { marginLeft: "auto", padding: "2px 8px", borderRadius: 16, color: "#fff", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, flexShrink: 0 },
  goldCard: { gridColumn: "span 2", background: "linear-gradient(180deg, rgba(22,44,66,0.95), rgba(14,30,45,0.95))", border: "2px solid rgba(201,163,74,0.5)", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  goldHead: { display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", borderBottom: "1px solid rgba(201,163,74,0.3)" },
  goldTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "1rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(201,163,74,0.15)" },
  statBox: { background: "rgba(10,21,32,0.8)", padding: "16px 12px", textAlign: "center" as const },
  statVal: { fontFamily: "'Fontin Sans', serif", fontSize: "1.3rem", fontWeight: 700, color: "#e4c778", textShadow: "0 0 10px rgba(228,199,120,0.25)" },
  statLbl: { fontSize: "0.7rem", color: "#9a8b6f", marginTop: 3, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  darkCard: { background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))", border: "1px solid rgba(45,80,115,0.5)", borderRadius: 12, overflow: "hidden" },
  darkHead: { padding: "12px 18px", borderBottom: "1px solid rgba(45,80,115,0.4)" },
  darkTitle: { fontFamily: "'Fontin Sans', serif", fontSize: "0.95rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  newsRow: { padding: "10px 18px", borderBottom: "1px solid rgba(45,80,115,0.2)" },
  eventBanner: { width: "100%", height: 60, objectFit: "cover" as const, display: "block", opacity: 0.7 },
  eventRow: { display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8, background: "rgba(10,21,32,0.5)", border: "1px solid rgba(45,80,115,0.3)", fontSize: "0.88rem" },
  footer: { padding: "24px 28px", textAlign: "center" as const },
  backLink: { position: "fixed" as const, bottom: 20, right: 20, padding: "8px 16px", borderRadius: 8, background: "rgba(10,21,32,0.9)", border: "1px solid rgba(201,163,74,0.4)", color: "#e4c778", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" },
};

export default RedesignV1APage;
