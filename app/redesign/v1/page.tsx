"use client";

/**
 * Version 1: "Fortress" — Medieval Fantasy / Skeuomorphic
 *
 * Leans into Total Battle game aesthetics: leather textures, parchment panels,
 * ornate gold borders, game banners, decorative ribbons, and the Fontin Sans font.
 */
function RedesignV1Page(): JSX.Element {
  return (
    <div style={styles.page}>
      <style>{`
        @font-face {
          font-family: 'Fontin Sans';
          src: url('/fonts/fontin_sans_cr_sc_regular.otf') format('opentype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
      {/* Fixed ornamental top bar */}
      <nav style={styles.topNav}>
        <div style={styles.topNavInner}>
          <div style={styles.logoGroup}>
            <img src="/assets/ui/components_shield_4.png" alt="" style={styles.logoIcon} />
            <span style={styles.logoText}>The Chillers</span>
          </div>
          <div style={styles.navLinks}>
            <a href="#" style={styles.navLink}>
              Dashboard
            </a>
            <a href="#" style={styles.navLink}>
              News
            </a>
            <a href="#" style={styles.navLink}>
              Events
            </a>
            <a href="#" style={styles.navLink}>
              Charts
            </a>
            <a href="#" style={styles.navLink}>
              Admin
            </a>
          </div>
          <div style={styles.navRight}>
            <div style={styles.notifBadge}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span style={styles.notifDot}>3</span>
            </div>
            <div style={styles.avatarBadge}>DK</div>
          </div>
        </div>
      </nav>

      {/* Hero banner with game imagery */}
      <section style={styles.hero}>
        <div style={styles.heroOverlay} />
        <img src="/assets/banners/banner_gold_dragon.png" alt="" style={styles.heroBanner} />
        <div style={styles.heroContent}>
          <img src="/assets/ui/decor_line_1.png" alt="" style={styles.decorLine} />
          <h1 style={styles.heroTitle}>Community Hub</h1>
          <p style={styles.heroSubtitle}>Coordinated. Competitive. Welcoming.</p>
          <img src="/assets/ui/decor_line_1.png" alt="" style={{ ...styles.decorLine, transform: "scaleY(-1)" }} />
        </div>
      </section>

      {/* Clan Context Banner */}
      <div style={styles.clanBanner}>
        <img src="/assets/ui/components_ribbon_5.png" alt="" style={styles.ribbonIcon} />
        <span style={styles.clanBannerText}>
          Active Clan: <strong style={{ color: "#e4c778" }}>The Chillers Alpha</strong>
        </span>
        <span style={styles.clanBannerAccount}>
          Game Account: <strong style={{ color: "#e4c778" }}>DragonKnight99</strong>
        </span>
      </div>

      {/* Main content grid */}
      <div style={styles.mainGrid}>
        {/* Announcements - parchment style */}
        <section style={styles.parchmentCard}>
          <div style={styles.parchmentHeader}>
            <img src="/assets/ui/icon_swords.png" alt="" style={styles.cardIcon} />
            <h2 style={styles.parchmentTitle}>Announcements</h2>
            <span style={styles.pinnedBadge}>Pinned</span>
          </div>
          <div style={styles.parchmentBody}>
            <div style={styles.parchmentItem}>
              <span style={styles.parchmentItemIcon}>&#9876;</span>
              <span>War prep tonight at 21:00 — full attendance required</span>
              <span style={styles.priorityBadge}>Priority</span>
            </div>
            <div style={styles.dividerLine} />
            <div style={styles.parchmentItem}>
              <span style={styles.parchmentItemIcon}>&#9993;</span>
              <span>Chest upload deadline this Friday</span>
              <span style={styles.infoBadge}>Info</span>
            </div>
            <div style={styles.dividerLine} />
            <div style={styles.parchmentItem}>
              <span style={styles.parchmentItemIcon}>&#9733;</span>
              <span>Alliance tournament registrations open</span>
              <span style={styles.infoBadge}>New</span>
            </div>
          </div>
        </section>

        {/* Quick Stats - ornate gold panel */}
        <section style={styles.goldCard}>
          <div style={styles.goldCardHeader}>
            <img src="/assets/ui/icons_chest_1.png" alt="" style={styles.cardIcon} />
            <h2 style={styles.goldCardTitle}>Quick Stats</h2>
          </div>
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>12,450</div>
              <div style={styles.statLabel}>Personal Score (7d)</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>210,980</div>
              <div style={styles.statLabel}>Clan Score (7d)</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>78/90</div>
              <div style={styles.statLabel}>Chest Submissions</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>86%</div>
              <div style={styles.statLabel}>Event Readiness</div>
            </div>
          </div>
        </section>

        {/* News Feed */}
        <section style={styles.darkCard}>
          <div style={styles.darkCardHeader}>
            <h2 style={styles.darkCardTitle}>News Feed</h2>
            <div style={styles.tabGroup}>
              <button style={styles.tabActive}>All</button>
              <button style={styles.tabInactive}>Clan</button>
              <button style={styles.tabInactive}>Global</button>
            </div>
          </div>
          <div style={styles.newsList}>
            {[
              { title: "Recruitment window opens this week", tag: "News", time: "2h ago" },
              { title: "Alliance update posted by leadership", tag: "Info", time: "5h ago" },
              { title: "War report and highlights published", tag: "Pinned", time: "1d ago" },
            ].map((item, i) => (
              <div key={i} style={styles.newsItem}>
                <div style={styles.newsItemLeft}>
                  <div style={styles.newsTitle}>{item.title}</div>
                  <div style={styles.newsTime}>{item.time}</div>
                </div>
                <span style={styles.newsBadge}>{item.tag}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming Events - with game banner */}
        <section style={styles.eventsCard}>
          <img src="/assets/banners/banner_ragnarok_clan_event_708x123.png" alt="" style={styles.eventBanner} />
          <div style={styles.eventsContent}>
            <h2 style={styles.darkCardTitle}>Upcoming Events</h2>
            <div style={styles.eventsList}>
              {[
                { name: "War Prep", date: "Today 20:30", color: "#c94a3a" },
                { name: "Guild Meeting", date: "Feb 5, 19:00", color: "#4a6ea0" },
                { name: "Training Night", date: "Feb 18, 21:00", color: "#4a9960" },
              ].map((ev, i) => (
                <div key={i} style={styles.eventItem}>
                  <div style={{ ...styles.eventDot, background: ev.color }} />
                  <span style={styles.eventName}>{ev.name}</span>
                  <span style={styles.eventDate}>{ev.date}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Links - leather panel */}
        <section style={styles.leatherPanel}>
          <h2 style={styles.leatherTitle}>Quick Actions</h2>
          <div style={styles.quickLinks}>
            <button style={styles.primaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              Upload CSV
            </button>
            <button style={styles.secondaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Review Rules
            </button>
            <button style={styles.secondaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Event Calendar
            </button>
          </div>
        </section>

        {/* Clan Progress */}
        <section style={styles.darkCard}>
          <div style={styles.darkCardHeader}>
            <h2 style={styles.darkCardTitle}>Clan Progress</h2>
          </div>
          <div style={styles.progressList}>
            {[
              { label: "Weekly Chest Target", value: 87, color: "#c9a34a" },
              { label: "Event Participation", value: 72, color: "#4a9960" },
              { label: "Member Activity", value: 94, color: "#4a6ea0" },
            ].map((bar, i) => (
              <div key={i} style={styles.progressItem}>
                <div style={styles.progressLabel}>
                  <span>{bar.label}</span>
                  <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}%</span>
                </div>
                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${bar.value}%`,
                      background: `linear-gradient(90deg, ${bar.color}88, ${bar.color})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <img src="/assets/ui/decor_line_1.png" alt="" style={{ ...styles.decorLine, opacity: 0.4 }} />
        <div style={styles.footerInner}>
          <span>The Chillers &bull; Community Hub</span>
          <span>Total Battle Clan Platform</span>
        </div>
      </footer>

      <a href="/redesign" style={styles.backLink}>
        &larr; Back to versions
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Fontin Sans', 'Inter', serif",
    background: "#080d14",
    backgroundImage: "radial-gradient(ellipse at 30% 0%, #152238 0%, #0a1220 50%, #080d14 100%)",
    backgroundAttachment: "fixed",
    color: "#f2e6c9",
    minHeight: "100vh",
    lineHeight: 1.6,
  },
  topNav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "linear-gradient(180deg, rgba(12,20,30,0.98) 0%, rgba(8,13,20,0.95) 100%)",
    borderBottom: "2px solid rgba(201,163,74,0.5)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(228,199,120,0.15) inset",
  },
  topNavInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    gap: 32,
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    objectFit: "contain",
  },
  logoText: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#e4c778",
    letterSpacing: "0.04em",
    textShadow: "0 0 20px rgba(228,199,120,0.3)",
  },
  navLinks: {
    display: "flex",
    gap: 6,
    flex: 1,
  },
  navLink: {
    color: "#9a8b6f",
    textDecoration: "none",
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: "0.9rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    transition: "all 0.2s",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  notifBadge: {
    position: "relative" as const,
    cursor: "pointer",
  },
  notifDot: {
    position: "absolute" as const,
    top: -6,
    right: -6,
    background: "#c94a3a",
    color: "#fff",
    fontSize: "0.6rem",
    fontWeight: 700,
    width: 16,
    height: 16,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "linear-gradient(180deg, rgba(201,163,74,0.25), rgba(138,109,47,0.15))",
    border: "2px solid #c9a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#e4c778",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  hero: {
    position: "relative" as const,
    height: 200,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heroOverlay: {
    position: "absolute" as const,
    inset: 0,
    background: "linear-gradient(180deg, rgba(8,13,20,0.3) 0%, rgba(8,13,20,0.85) 100%)",
    zIndex: 1,
  },
  heroBanner: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.6,
  },
  heroContent: {
    position: "relative" as const,
    zIndex: 2,
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 6,
  },
  heroTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#e4c778",
    letterSpacing: "0.06em",
    textShadow: "0 2px 16px rgba(201,163,74,0.4), 0 0 40px rgba(201,163,74,0.2)",
    textTransform: "uppercase" as const,
    margin: 0,
  },
  heroSubtitle: {
    fontSize: "1rem",
    color: "#9a8b6f",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    margin: 0,
  },
  decorLine: {
    width: 200,
    height: "auto",
    opacity: 0.6,
  },
  clanBanner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid rgba(201,163,74,0.2)",
    fontSize: "0.85rem",
    color: "#9a8b6f",
  },
  ribbonIcon: {
    width: 28,
    height: "auto",
    opacity: 0.7,
  },
  clanBannerText: { flex: 1 },
  clanBannerAccount: {},
  mainGrid: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "28px 24px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
  },
  parchmentCard: {
    gridColumn: "span 2",
    background: "linear-gradient(180deg, #e8dcc4 0%, #d8cab0 100%)",
    border: "2px solid #b5a07a",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
  },
  parchmentHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    background: "linear-gradient(180deg, #5a4325 0%, #3d2d12 100%)",
    borderBottom: "2px solid #8a6d2f",
  },
  parchmentTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#e4c778",
    letterSpacing: "0.04em",
    flex: 1,
    margin: 0,
  },
  pinnedBadge: {
    padding: "4px 12px",
    borderRadius: 20,
    background: "linear-gradient(180deg, rgba(201,163,74,0.25), rgba(138,109,47,0.15))",
    border: "1px solid #c9a34a",
    color: "#e4c778",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  parchmentBody: {
    padding: "16px 20px",
    color: "#3a3020",
  },
  parchmentItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    fontSize: "0.9rem",
    color: "#3a2a18",
  },
  parchmentItemIcon: {
    fontSize: "1.1rem",
    color: "#8a6d2f",
    width: 24,
    textAlign: "center" as const,
  },
  dividerLine: {
    height: 1,
    background: "linear-gradient(90deg, transparent, #b5a07a, transparent)",
  },
  priorityBadge: {
    marginLeft: "auto",
    padding: "3px 10px",
    borderRadius: 20,
    background: "linear-gradient(180deg, #c94a3a, #a33b2b)",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  infoBadge: {
    marginLeft: "auto",
    padding: "3px 10px",
    borderRadius: 20,
    background: "linear-gradient(180deg, #4a6ea0, #365a85)",
    color: "#fff",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  cardIcon: {
    width: 24,
    height: 24,
    objectFit: "contain" as const,
  },
  goldCard: {
    gridColumn: "span 2",
    background: "linear-gradient(180deg, rgba(22,44,66,0.95) 0%, rgba(14,30,45,0.95) 100%)",
    border: "2px solid rgba(201,163,74,0.5)",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 24px rgba(201,163,74,0.08)",
    position: "relative" as const,
  },
  goldCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderBottom: "1px solid rgba(201,163,74,0.3)",
  },
  goldCardTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#e4c778",
    letterSpacing: "0.04em",
    margin: 0,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 1,
    background: "rgba(201,163,74,0.15)",
  },
  statBox: {
    background: "rgba(10,21,32,0.8)",
    padding: "20px 16px",
    textAlign: "center" as const,
  },
  statValue: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#e4c778",
    textShadow: "0 0 12px rgba(228,199,120,0.3)",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#9a8b6f",
    marginTop: 4,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  darkCard: {
    background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))",
    border: "1px solid rgba(45,80,115,0.5)",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  darkCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 20px",
    borderBottom: "1px solid rgba(45,80,115,0.4)",
  },
  darkCardTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#e4c778",
    letterSpacing: "0.03em",
    margin: 0,
  },
  tabGroup: {
    display: "flex",
    gap: 4,
    background: "rgba(10,21,32,0.6)",
    borderRadius: 20,
    padding: 3,
  },
  tabActive: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1px solid #c9a34a",
    background: "linear-gradient(180deg, rgba(201,163,74,0.2), rgba(138,109,47,0.1))",
    color: "#e4c778",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  tabInactive: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1px solid transparent",
    background: "transparent",
    color: "#5c5040",
    fontSize: "0.75rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  newsList: {
    display: "flex",
    flexDirection: "column" as const,
  },
  newsItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 20px",
    borderBottom: "1px solid rgba(45,80,115,0.2)",
  },
  newsItemLeft: { flex: 1 },
  newsTitle: { fontSize: "0.9rem", color: "#f2e6c9" },
  newsTime: { fontSize: "0.75rem", color: "#5c5040", marginTop: 2 },
  newsBadge: {
    padding: "3px 10px",
    borderRadius: 20,
    border: "1px solid rgba(201,163,74,0.4)",
    color: "#c9a34a",
    fontSize: "0.65rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  eventsCard: {
    background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))",
    border: "1px solid rgba(45,80,115,0.5)",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  eventBanner: {
    width: "100%",
    height: 80,
    objectFit: "cover" as const,
    display: "block",
    opacity: 0.75,
  },
  eventsContent: {
    padding: "14px 20px",
  },
  eventsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
    marginTop: 12,
  },
  eventItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(10,21,32,0.5)",
    border: "1px solid rgba(45,80,115,0.3)",
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  eventName: { flex: 1, fontSize: "0.9rem" },
  eventDate: {
    fontSize: "0.75rem",
    color: "#9a8b6f",
    fontWeight: 600,
  },
  leatherPanel: {
    background: `linear-gradient(180deg, rgba(58,48,32,0.9), rgba(38,26,10,0.95))`,
    border: "2px solid rgba(138,109,47,0.6)",
    borderRadius: 12,
    padding: "20px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(228,199,120,0.1)",
  },
  leatherTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#e4c778",
    letterSpacing: "0.04em",
    margin: "0 0 16px 0",
  },
  quickLinks: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 18px",
    borderRadius: 8,
    border: "2px solid #c9a34a",
    background: "linear-gradient(180deg, #4d3915, #30200c)",
    color: "#e4c778",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.02em",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(228,199,120,0.2)",
  },
  secondaryButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid rgba(201,163,74,0.4)",
    background: "linear-gradient(180deg, rgba(15,34,51,0.6), rgba(10,25,40,0.7))",
    color: "#e4c778",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  progressList: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  },
  progressItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  progressLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    color: "#9a8b6f",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    background: "rgba(10,21,32,0.6)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.6s ease",
  },
  footer: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 24px 32px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
  },
  footerInner: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    fontSize: "0.8rem",
    color: "#5c5040",
  },
  backLink: {
    position: "fixed" as const,
    bottom: 20,
    left: 20,
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(10,21,32,0.9)",
    border: "1px solid rgba(201,163,74,0.4)",
    color: "#e4c778",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    zIndex: 200,
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
};

export default RedesignV1Page;
