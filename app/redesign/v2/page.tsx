"use client";

/**
 * Version 2: "Eclipse" — Modern Dark Glassmorphism
 *
 * Clean glassmorphism with frosted glass panels, gradient mesh background,
 * subtle gold accent system, smooth animations. Feels like a premium SaaS dashboard
 * with a gaming twist.
 */
function RedesignV2Page(): JSX.Element {
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        .v2-glass { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
        .v2-nav-link:hover { background: rgba(255,255,255,0.06); color: #e4c778; }
        .v2-card:hover { border-color: rgba(201,163,74,0.35); transform: translateY(-2px); }
        .v2-card { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
        .v2-btn:hover { border-color: #e4c778; box-shadow: 0 0 20px rgba(228,199,120,0.15); }
        .v2-stat-card:hover { border-color: rgba(201,163,74,0.5); }
        .v2-stat-card { transition: all 0.2s ease; }
        @keyframes v2-glow { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }
      `}</style>

      {/* Ambient background blobs */}
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />
      <div style={styles.bgBlob3} />

      {/* Floating navbar */}
      <nav style={styles.navbar} className="v2-glass">
        <div style={styles.navInner}>
          <div style={styles.brand}>
            <div style={styles.brandIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2.5"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><line x1="12" y1="22" x2="12" y2="15.5" /><line x1="22" y1="8.5" x2="12" y2="15.5" /><line x1="2" y1="8.5" x2="12" y2="15.5" /></svg>
            </div>
            <span style={styles.brandName}>TotalChiller</span>
          </div>
          <div style={styles.navCenter}>
            {["Dashboard", "News", "Events", "Charts", "Messages"].map((label) => (
              <a key={label} href="#" style={styles.navLinkStyle} className="v2-nav-link">{label}</a>
            ))}
          </div>
          <div style={styles.navEnd}>
            <div style={styles.searchBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5c5040" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <span style={styles.searchPlaceholder}>Search...</span>
              <span style={styles.searchKbd}>&#8984;K</span>
            </div>
            <button style={styles.bellBtn} aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
              <span style={styles.bellDot} />
            </button>
            <div style={styles.avatar}>
              <img src="/assets/backgrounds/clan_background_3.png" alt="" style={styles.avatarImg} />
              <span style={styles.avatarInitials}>DK</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Page header */}
      <div style={styles.pageContent}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>Welcome back, DragonKnight</h1>
            <p style={styles.pageSubtitle}>The Chillers Alpha &bull; Officer</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.outlineBtn} className="v2-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              Upload CSV
            </button>
            <button style={styles.goldBtn} className="v2-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Post
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={styles.statsRow}>
          {[
            { label: "Personal Score", value: "12,450", change: "+8%", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
            { label: "Clan Score", value: "210,980", change: "+12%", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
            { label: "Chest Submissions", value: "78 / 90", change: "87%", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { label: "Active Members", value: "42", change: "+3", icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2M9 7a4 4 0 100-8 4 4 0 000 8z" },
          ].map((stat, i) => (
            <div key={i} style={styles.statCard} className="v2-glass v2-stat-card">
              <div style={styles.statIconBox}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a34a" strokeWidth="1.5"><path d={stat.icon} /></svg>
              </div>
              <div>
                <div style={styles.statLabel}>{stat.label}</div>
                <div style={styles.statValue}>{stat.value}</div>
              </div>
              <span style={styles.statChange}>{stat.change}</span>
            </div>
          ))}
        </div>

        {/* Two-column content */}
        <div style={styles.twoCol}>
          {/* Left column */}
          <div style={styles.colMain}>
            {/* Announcements */}
            <div style={styles.glassCard} className="v2-glass v2-card">
              <div style={styles.cardTop}>
                <h2 style={styles.cardTitle}>Announcements</h2>
                <span style={styles.chipGold}>Pinned</span>
              </div>
              <div style={styles.cardBody}>
                {[
                  { text: "War prep tonight at 21:00", tag: "Priority", tagColor: "#c94a3a" },
                  { text: "Chest upload deadline Friday", tag: "Info", tagColor: "#4a6ea0" },
                  { text: "Alliance tournament registrations open", tag: "New", tagColor: "#4a9960" },
                ].map((item, i) => (
                  <div key={i} style={styles.listRow}>
                    <div style={{ ...styles.listDot, background: item.tagColor }} />
                    <span style={styles.listText}>{item.text}</span>
                    <span style={{ ...styles.listTag, color: item.tagColor, borderColor: `${item.tagColor}44` }}>{item.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* News Feed */}
            <div style={styles.glassCard} className="v2-glass v2-card">
              <div style={styles.cardTop}>
                <h2 style={styles.cardTitle}>News Feed</h2>
                <div style={styles.pillTabs}>
                  <button style={styles.pillActive}>All</button>
                  <button style={styles.pillInactive}>Clan</button>
                  <button style={styles.pillInactive}>Global</button>
                </div>
              </div>
              <div style={styles.cardBody}>
                {[
                  { title: "Recruitment window opens this week", time: "2h ago", author: "Admin" },
                  { title: "Alliance update posted by leadership", time: "5h ago", author: "ClanLead" },
                  { title: "War report and highlights published", time: "1d ago", author: "Officer" },
                ].map((item, i) => (
                  <div key={i} style={styles.newsRow}>
                    <div style={styles.newsAvatar}>{item.author[0]}</div>
                    <div style={styles.newsInfo}>
                      <div style={styles.newsTitle}>{item.title}</div>
                      <div style={styles.newsMeta}>{item.author} &bull; {item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clan Progress */}
            <div style={styles.glassCard} className="v2-glass v2-card">
              <div style={styles.cardTop}>
                <h2 style={styles.cardTitle}>Clan Progress</h2>
              </div>
              <div style={styles.cardBody}>
                {[
                  { label: "Weekly Chest Target", value: 87, color: "#c9a34a" },
                  { label: "Event Participation", value: 72, color: "#4a9960" },
                  { label: "Member Activity", value: 94, color: "#4a6ea0" },
                ].map((bar, i) => (
                  <div key={i} style={styles.progressRow}>
                    <div style={styles.progressHead}>
                      <span style={styles.progressLabel}>{bar.label}</span>
                      <span style={{ ...styles.progressValue, color: bar.color }}>{bar.value}%</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${bar.value}%`, background: `linear-gradient(90deg, ${bar.color}66, ${bar.color})` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={styles.colSide}>
            {/* Events */}
            <div style={styles.glassCard} className="v2-glass v2-card">
              <div style={styles.cardTop}>
                <h2 style={styles.cardTitle}>Upcoming Events</h2>
              </div>
              <div style={styles.cardBody}>
                {[
                  { name: "War Prep", date: "Today", time: "20:30", color: "#c94a3a" },
                  { name: "Guild Meeting", date: "Feb 5", time: "19:00", color: "#4a6ea0" },
                  { name: "Training Night", date: "Feb 18", time: "21:00", color: "#4a9960" },
                  { name: "Chest Review", date: "Feb 20", time: "18:00", color: "#c9a34a" },
                ].map((ev, i) => (
                  <div key={i} style={styles.eventRow}>
                    <div style={{ ...styles.eventLine, background: ev.color }} />
                    <div style={styles.eventInfo}>
                      <div style={styles.eventName}>{ev.name}</div>
                      <div style={styles.eventDate}>{ev.date}, {ev.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={styles.glassCard} className="v2-glass v2-card">
              <div style={styles.cardTop}>
                <h2 style={styles.cardTitle}>Quick Actions</h2>
              </div>
              <div style={styles.actionGrid}>
                {[
                  { label: "Upload CSV", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
                  { label: "Review Rules", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                  { label: "Charts", icon: "M18 20V10M12 20V4M6 20v-6" },
                  { label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                ].map((action, i) => (
                  <button key={i} style={styles.actionBtn} className="v2-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a34a" strokeWidth="1.5"><path d={action.icon} /></svg>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top Players mini */}
            <div style={styles.glassCard} className="v2-glass v2-card">
              <div style={styles.cardTop}>
                <h2 style={styles.cardTitle}>Top Players</h2>
                <span style={styles.timePeriod}>This week</span>
              </div>
              <div style={styles.cardBody}>
                {[
                  { name: "DragonKnight99", score: "4,250", rank: 1 },
                  { name: "IceWarden", score: "3,890", rank: 2 },
                  { name: "ShadowMage", score: "3,410", rank: 3 },
                  { name: "StormBreaker", score: "2,980", rank: 4 },
                ].map((player, i) => (
                  <div key={i} style={styles.playerRow}>
                    <span style={{ ...styles.rankBadge, ...(i === 0 ? styles.rankGold : i === 1 ? styles.rankSilver : i === 2 ? styles.rankBronze : {}) }}>
                      {player.rank}
                    </span>
                    <span style={styles.playerName}>{player.name}</span>
                    <span style={styles.playerScore}>{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>The Chillers &bull; Community Hub</span>
        <span>Total Battle Clan Platform</span>
      </footer>

      <a href="/redesign" style={styles.backLink}>&larr; Back to versions</a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "#060a10",
    color: "#e8ddd0",
    minHeight: "100vh",
    position: "relative" as const,
    overflow: "hidden",
  },
  bgBlob1: {
    position: "fixed" as const,
    width: 600,
    height: 600,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(201,163,74,0.08) 0%, transparent 70%)",
    top: -200,
    left: -100,
    pointerEvents: "none" as const,
    animation: "v2-glow 8s ease-in-out infinite",
  },
  bgBlob2: {
    position: "fixed" as const,
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(74,110,160,0.06) 0%, transparent 70%)",
    bottom: -150,
    right: -100,
    pointerEvents: "none" as const,
    animation: "v2-glow 10s ease-in-out infinite 2s",
  },
  bgBlob3: {
    position: "fixed" as const,
    width: 400,
    height: 400,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(201,163,74,0.04) 0%, transparent 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none" as const,
  },
  navbar: {
    position: "sticky" as const,
    top: 12,
    zIndex: 100,
    margin: "12px 16px 0",
    borderRadius: 14,
    background: "rgba(10,16,24,0.75)",
    border: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  },
  navInner: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, rgba(201,163,74,0.15), rgba(201,163,74,0.05))",
    border: "1px solid rgba(201,163,74,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#f2e6c9",
    letterSpacing: "-0.02em",
  },
  navCenter: {
    flex: 1,
    display: "flex",
    gap: 2,
  },
  navLinkStyle: {
    color: "#7a6e5a",
    textDecoration: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: "0.85rem",
    fontWeight: 500,
    transition: "all 0.15s",
  },
  navEnd: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
  },
  searchPlaceholder: {
    fontSize: "0.8rem",
    color: "#5c5040",
  },
  searchKbd: {
    fontSize: "0.65rem",
    color: "#5c5040",
    background: "rgba(255,255,255,0.06)",
    padding: "2px 6px",
    borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace",
  },
  bellBtn: {
    position: "relative" as const,
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    color: "#7a6e5a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  bellDot: {
    position: "absolute" as const,
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#c94a3a",
    border: "2px solid #060a10",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    position: "relative" as const,
    overflow: "hidden",
    border: "2px solid rgba(201,163,74,0.3)",
    cursor: "pointer",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.6,
  },
  avatarInitials: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#e4c778",
  },
  pageContent: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "28px 24px",
    position: "relative" as const,
    zIndex: 1,
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "#f2e6c9",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  pageSubtitle: {
    fontSize: "0.9rem",
    color: "#7a6e5a",
    marginTop: 4,
  },
  headerActions: {
    display: "flex",
    gap: 10,
  },
  outlineBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    color: "#e8ddd0",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  goldBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid rgba(201,163,74,0.5)",
    background: "linear-gradient(135deg, rgba(201,163,74,0.15), rgba(201,163,74,0.05))",
    color: "#e4c778",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    padding: "18px 16px",
    borderRadius: 14,
    background: "rgba(12,20,30,0.6)",
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: "linear-gradient(135deg, rgba(201,163,74,0.1), rgba(201,163,74,0.03))",
    border: "1px solid rgba(201,163,74,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#7a6e5a",
    marginBottom: 2,
  },
  statValue: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f2e6c9",
  },
  statChange: {
    marginLeft: "auto",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#4a9960",
    background: "rgba(74,153,96,0.1)",
    padding: "3px 8px",
    borderRadius: 6,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: 16,
  },
  colMain: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  colSide: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  glassCard: {
    borderRadius: 14,
    background: "rgba(12,20,30,0.55)",
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  cardTitle: {
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#f2e6c9",
    margin: 0,
  },
  chipGold: {
    padding: "3px 10px",
    borderRadius: 6,
    background: "rgba(201,163,74,0.12)",
    border: "1px solid rgba(201,163,74,0.25)",
    color: "#c9a34a",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  cardBody: {
    padding: "6px 0",
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  listText: {
    flex: 1,
    fontSize: "0.88rem",
  },
  listTag: {
    fontSize: "0.65rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    padding: "2px 8px",
    borderRadius: 4,
    border: "1px solid",
  },
  pillTabs: {
    display: "flex",
    gap: 2,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 2,
  },
  pillActive: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "none",
    background: "rgba(201,163,74,0.15)",
    color: "#e4c778",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  pillInactive: {
    padding: "5px 12px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#5c5040",
    fontSize: "0.75rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  newsRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  newsAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, rgba(201,163,74,0.15), rgba(74,110,160,0.15))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#c9a34a",
    flexShrink: 0,
  },
  newsInfo: { flex: 1 },
  newsTitle: { fontSize: "0.88rem", fontWeight: 500 },
  newsMeta: { fontSize: "0.75rem", color: "#5c5040", marginTop: 2 },
  progressRow: {
    padding: "10px 20px",
  },
  progressHead: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: { fontSize: "0.82rem", color: "#9a8b6f" },
  progressValue: { fontSize: "0.82rem", fontWeight: 700 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    background: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  eventRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 12,
    padding: "10px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  eventLine: {
    width: 3,
    borderRadius: 2,
    flexShrink: 0,
  },
  eventInfo: {},
  eventName: { fontSize: "0.88rem", fontWeight: 600 },
  eventDate: { fontSize: "0.75rem", color: "#7a6e5a", marginTop: 2 },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: "12px 16px",
  },
  actionBtn: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    padding: "16px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
    color: "#9a8b6f",
    fontSize: "0.78rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  timePeriod: {
    fontSize: "0.75rem",
    color: "#5c5040",
  },
  playerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.02)",
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    background: "rgba(255,255,255,0.04)",
    color: "#5c5040",
  },
  rankGold: {
    background: "linear-gradient(135deg, rgba(201,163,74,0.25), rgba(201,163,74,0.1))",
    color: "#e4c778",
    border: "1px solid rgba(201,163,74,0.3)",
  },
  rankSilver: {
    background: "rgba(192,192,192,0.1)",
    color: "#c0c0c0",
    border: "1px solid rgba(192,192,192,0.2)",
  },
  rankBronze: {
    background: "rgba(180,130,80,0.1)",
    color: "#b48250",
    border: "1px solid rgba(180,130,80,0.2)",
  },
  playerName: { flex: 1, fontSize: "0.85rem" },
  playerScore: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.82rem",
    color: "#c9a34a",
    fontWeight: 500,
  },
  footer: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "32px 24px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.8rem",
    color: "#3a3020",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    position: "relative" as const,
    zIndex: 1,
  },
  backLink: {
    position: "fixed" as const,
    bottom: 20,
    left: 20,
    padding: "8px 16px",
    borderRadius: 10,
    background: "rgba(10,16,24,0.9)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e4c778",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    zIndex: 200,
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
};

export default RedesignV2Page;
