"use client";

/**
 * Version 3: "Nexus" — Bento Grid / Modern Minimal
 *
 * Asymmetric bento grid layout, mixed-content cards, monospace data accents,
 * bold typography, minimal decoration. Data-forward with a clean, high-contrast
 * gaming dashboard feel. Uses clan backgrounds as ambient imagery.
 */
function RedesignV3Page(): JSX.Element {
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .v3-bento:hover { border-color: rgba(201,163,74,0.4); transform: translateY(-1px); }
        .v3-bento { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
        .v3-nav-link:hover { color: #e4c778; }
        .v3-action:hover { background: rgba(201,163,74,0.12); border-color: rgba(201,163,74,0.4); color: #e4c778; }
        .v3-action { transition: all 0.15s ease; }
      `}</style>

      {/* Compact top bar */}
      <nav style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.logoArea}>
            <div style={styles.logoMark}>TC</div>
            <div style={styles.logoStack}>
              <span style={styles.logoName}>TotalChiller</span>
              <span style={styles.logoSub}>Clan Platform</span>
            </div>
          </div>
          <div style={styles.navPills}>
            {["Dashboard", "News", "Events", "Charts", "Admin"].map((label, i) => (
              <a key={label} href="#" style={i === 0 ? styles.navPillActive : styles.navPill} className="v3-nav-link">
                {label}
              </a>
            ))}
          </div>
          <div style={styles.topBarRight}>
            <div style={styles.clanTag}>
              <span style={styles.clanDot} />
              The Chillers Alpha
            </div>
            <div style={styles.miniAvatar}>DK</div>
          </div>
        </div>
      </nav>

      {/* Main bento grid */}
      <div style={styles.bentoContainer}>
        {/* Row 1: Hero + stat cards */}
        <div style={styles.bentoGrid}>
          {/* Hero card - spans 2 cols */}
          <div style={styles.heroCard} className="v3-bento">
            <img src="/assets/backgrounds/clan_background_10.png" alt="" style={styles.heroBg} />
            <div style={styles.heroOverlay} />
            <div style={styles.heroInner}>
              <div style={styles.heroTag}>Community Hub</div>
              <h1 style={styles.heroTitle}>
                Welcome back,
                <br />
                <span style={styles.heroName}>DragonKnight</span>
              </h1>
              <p style={styles.heroDesc}>Your clan is performing well this week. 3 events coming up.</p>
              <div style={styles.heroActions}>
                <button style={styles.heroPrimary} className="v3-action">
                  Upload CSV
                </button>
                <button style={styles.heroSecondary} className="v3-action">
                  View Charts
                </button>
              </div>
            </div>
          </div>

          {/* Personal Score */}
          <div style={styles.statBento} className="v3-bento">
            <div style={styles.statMini}>
              <span style={styles.statIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a34a" strokeWidth="2">
                  <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
              <span style={styles.statTrend}>+8.2%</span>
            </div>
            <div style={styles.bigNumber}>12,450</div>
            <div style={styles.statDesc}>Personal Score</div>
            <div style={styles.sparkline}>
              <svg viewBox="0 0 120 32" style={{ width: "100%", height: 32 }}>
                <polyline
                  points="0,28 15,24 30,26 45,18 60,20 75,12 90,14 105,6 120,8"
                  fill="none"
                  stroke="#c9a34a"
                  strokeWidth="2"
                />
                <polyline
                  points="0,28 15,24 30,26 45,18 60,20 75,12 90,14 105,6 120,8 120,32 0,32"
                  fill="url(#sparkGrad)"
                />
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c9a34a" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#c9a34a" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Clan Score */}
          <div style={styles.statBento} className="v3-bento">
            <div style={styles.statMini}>
              <span style={styles.statIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a6ea0" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </span>
              <span style={{ ...styles.statTrend, color: "#4a9960" }}>+12%</span>
            </div>
            <div style={styles.bigNumber}>210,980</div>
            <div style={styles.statDesc}>Clan Score</div>
            <div style={styles.sparkline}>
              <svg viewBox="0 0 120 32" style={{ width: "100%", height: 32 }}>
                <polyline
                  points="0,26 20,22 40,24 60,16 80,14 100,10 120,6"
                  fill="none"
                  stroke="#4a6ea0"
                  strokeWidth="2"
                />
                <polyline points="0,26 20,22 40,24 60,16 80,14 100,10 120,6 120,32 0,32" fill="url(#sparkGrad2)" />
                <defs>
                  <linearGradient id="sparkGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a6ea0" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4a6ea0" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Announcements - spans 2 cols */}
          <div style={styles.wideCard} className="v3-bento">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardLabel}>Announcements</h2>
              <span style={styles.countBadge}>3</span>
            </div>
            <div style={styles.announceList}>
              {[
                { text: "War prep tonight at 21:00", tag: "PRIORITY", color: "#c94a3a" },
                { text: "Chest upload deadline Friday", tag: "INFO", color: "#4a6ea0" },
                { text: "Alliance tournament registrations", tag: "NEW", color: "#4a9960" },
              ].map((item, i) => (
                <div key={i} style={styles.announceItem}>
                  <div style={{ ...styles.announceDot, background: item.color }} />
                  <span style={styles.announceText}>{item.text}</span>
                  <code style={{ ...styles.announceTag, color: item.color }}>{item.tag}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Chest Submissions gauge */}
          <div style={styles.gaugeBento} className="v3-bento">
            <div style={styles.cardLabel}>Chest Submissions</div>
            <div style={styles.gaugeCenter}>
              <svg viewBox="0 0 120 120" style={{ width: 100, height: 100 }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#c9a34a"
                  strokeWidth="8"
                  strokeDasharray={`${87 * 3.27} ${100 * 3.27}`}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
                <text
                  x="60"
                  y="56"
                  textAnchor="middle"
                  fill="#f2e6c9"
                  fontSize="20"
                  fontWeight="700"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  78
                </text>
                <text
                  x="60"
                  y="72"
                  textAnchor="middle"
                  fill="#5c5040"
                  fontSize="11"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  /90
                </text>
              </svg>
            </div>
            <div style={styles.gaugeFooter}>
              <span style={styles.gaugePct}>87%</span>
              <span style={styles.gaugeLabel}>complete</span>
            </div>
          </div>

          {/* Events */}
          <div style={styles.tallCard} className="v3-bento">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardLabel}>Events</h2>
              <span style={styles.monoSmall}>This week</span>
            </div>
            <div style={styles.eventsList}>
              {[
                { name: "War Prep", date: "Today 20:30", color: "#c94a3a", active: true },
                { name: "Guild Meeting", date: "Feb 5 19:00", color: "#4a6ea0", active: false },
                { name: "Training Night", date: "Feb 18 21:00", color: "#4a9960", active: false },
                { name: "Chest Review", date: "Feb 20 18:00", color: "#c9a34a", active: false },
              ].map((ev, i) => (
                <div key={i} style={{ ...styles.eventRow, ...(ev.active ? styles.eventRowActive : {}) }}>
                  <div style={{ ...styles.eventStripe, background: ev.color }} />
                  <div>
                    <div style={styles.eventName}>{ev.name}</div>
                    <code style={styles.eventDate}>{ev.date}</code>
                  </div>
                  {ev.active && <span style={styles.liveDot}>LIVE</span>}
                </div>
              ))}
            </div>
          </div>

          {/* News */}
          <div style={styles.tallCard} className="v3-bento">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardLabel}>News</h2>
              <div style={styles.filterChips}>
                <span style={styles.chipActive}>All</span>
                <span style={styles.chip}>Clan</span>
              </div>
            </div>
            <div style={styles.newsList}>
              {[
                { title: "Recruitment opens this week", time: "2h", pinned: false },
                { title: "Alliance update posted", time: "5h", pinned: false },
                { title: "War report highlights", time: "1d", pinned: true },
              ].map((item, i) => (
                <div key={i} style={styles.newsItem}>
                  <div style={styles.newsContent}>
                    <span style={styles.newsTitle}>{item.title}</span>
                    <code style={styles.newsTime}>{item.time}</code>
                  </div>
                  {item.pinned && <span style={styles.pinIcon}>&#9734;</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Top Players */}
          <div style={styles.wideCard} className="v3-bento">
            <div style={styles.cardHeader}>
              <h2 style={styles.cardLabel}>Top Players</h2>
              <span style={styles.monoSmall}>7d ranking</span>
            </div>
            <div style={styles.leaderboard}>
              {[
                { name: "DragonKnight99", score: 4250, pct: 100 },
                { name: "IceWarden", score: 3890, pct: 91 },
                { name: "ShadowMage", score: 3410, pct: 80 },
                { name: "StormBreaker", score: 2980, pct: 70 },
                { name: "PhoenixRider", score: 2540, pct: 60 },
              ].map((player, i) => (
                <div key={i} style={styles.lbRow}>
                  <span
                    style={{
                      ...styles.lbRank,
                      ...(i === 0
                        ? styles.lbRankGold
                        : i === 1
                          ? styles.lbRankSilver
                          : i === 2
                            ? styles.lbRankBronze
                            : {}),
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={styles.lbName}>{player.name}</span>
                  <div style={styles.lbBar}>
                    <div style={{ ...styles.lbFill, width: `${player.pct}%` }} />
                  </div>
                  <code style={styles.lbScore}>{player.score.toLocaleString()}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={styles.actionsCard} className="v3-bento">
            <div style={styles.cardLabel}>Actions</div>
            <div style={styles.actionPills}>
              {[
                { label: "Upload", icon: "\u2191" },
                { label: "Rules", icon: "\u2261" },
                { label: "Charts", icon: "\u2237" },
                { label: "Calendar", icon: "\u25A1" },
                { label: "Messages", icon: "\u2709" },
                { label: "Settings", icon: "\u2699" },
              ].map((action, i) => (
                <button key={i} style={styles.actionPill} className="v3-action">
                  <span style={styles.actionIcon}>{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Banner card with game image */}
          <div style={styles.bannerBento} className="v3-bento">
            <img src="/assets/banners/banner_chest.png" alt="" style={styles.bannerImg} />
            <div style={styles.bannerOverlay} />
            <div style={styles.bannerContent}>
              <div style={styles.bannerTag}>Featured Event</div>
              <div style={styles.bannerTitle}>Clan Chest Challenge</div>
              <code style={styles.bannerDate}>Ends in 3d 14h</code>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <span style={styles.footerMono}>TC//2026</span>
          <span style={styles.footerText}>The Chillers &bull; Community Hub</span>
          <span style={styles.footerText}>Total Battle Clan Platform</span>
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
    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
    background: "#08090c",
    color: "#e0d8ca",
    minHeight: "100vh",
  },
  topBar: {
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
    background: "rgba(8,9,12,0.95)",
    backdropFilter: "blur(12px)",
  },
  topBarInner: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "10px 24px",
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, #c9a34a, #8a6d2f)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#080d14",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "-0.02em",
  },
  logoStack: {
    display: "flex",
    flexDirection: "column" as const,
    lineHeight: 1.2,
  },
  logoName: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#f2e6c9",
  },
  logoSub: {
    fontSize: "0.65rem",
    color: "#5c5040",
    fontFamily: "'JetBrains Mono', monospace",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  navPills: {
    flex: 1,
    display: "flex",
    gap: 2,
  },
  navPill: {
    color: "#5c5040",
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: "0.82rem",
    fontWeight: 500,
    transition: "color 0.15s",
  },
  navPillActive: {
    color: "#e4c778",
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: 6,
    fontSize: "0.82rem",
    fontWeight: 600,
    background: "rgba(201,163,74,0.08)",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  clanTag: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    fontSize: "0.78rem",
    color: "#9a8b6f",
    fontFamily: "'JetBrains Mono', monospace",
  },
  clanDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#4a9960",
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "linear-gradient(135deg, rgba(201,163,74,0.2), rgba(74,110,160,0.15))",
    border: "1px solid rgba(201,163,74,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#e4c778",
    fontFamily: "'JetBrains Mono', monospace",
  },
  bentoContainer: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "24px 24px",
  },
  bentoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
  },
  heroCard: {
    gridColumn: "span 2",
    gridRow: "span 2",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
    position: "relative" as const,
    minHeight: 280,
  },
  heroBg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.35,
  },
  heroOverlay: {
    position: "absolute" as const,
    inset: 0,
    background: "linear-gradient(135deg, rgba(8,9,12,0.85) 0%, rgba(8,9,12,0.5) 100%)",
  },
  heroInner: {
    position: "relative" as const,
    zIndex: 1,
    padding: "28px 28px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "flex-end",
    height: "100%",
  },
  heroTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.65rem",
    color: "#c9a34a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1.2,
    color: "#f2e6c9",
    margin: "0 0 8px 0",
  },
  heroName: {
    color: "#e4c778",
  },
  heroDesc: {
    fontSize: "0.9rem",
    color: "#7a6e5a",
    margin: "0 0 20px 0",
    maxWidth: 400,
  },
  heroActions: {
    display: "flex",
    gap: 10,
  },
  heroPrimary: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid rgba(201,163,74,0.5)",
    background: "linear-gradient(135deg, rgba(201,163,74,0.15), rgba(201,163,74,0.05))",
    color: "#e4c778",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  heroSecondary: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    color: "#9a8b6f",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  statBento: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(12,14,18,0.8)",
    padding: "18px 18px 0",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  statMini: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "rgba(201,163,74,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statTrend: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#4a9960",
    background: "rgba(74,153,96,0.1)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  bigNumber: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#f2e6c9",
    letterSpacing: "-0.02em",
  },
  statDesc: {
    fontSize: "0.78rem",
    color: "#5c5040",
    marginTop: 2,
  },
  sparkline: {
    marginTop: "auto",
    marginLeft: -18,
    marginRight: -18,
    marginBottom: 0,
  },
  wideCard: {
    gridColumn: "span 2",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(12,14,18,0.8)",
    padding: "18px 20px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  cardLabel: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#9a8b6f",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    margin: 0,
  },
  countBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#c9a34a",
    background: "rgba(201,163,74,0.1)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  announceList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  announceItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
  },
  announceDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  announceText: {
    flex: 1,
    fontSize: "0.88rem",
  },
  announceTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.65rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
  },
  gaugeBento: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(12,14,18,0.8)",
    padding: "18px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
  },
  gaugeCenter: {
    margin: "12px 0",
  },
  gaugeFooter: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  gaugePct: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#c9a34a",
  },
  gaugeLabel: {
    fontSize: "0.75rem",
    color: "#5c5040",
  },
  tallCard: {
    gridRow: "span 1",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(12,14,18,0.8)",
    padding: "18px 20px",
  },
  monoSmall: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    color: "#5c5040",
  },
  eventsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  eventRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
  },
  eventRowActive: {
    background: "rgba(201,74,58,0.06)",
    border: "1px solid rgba(201,74,58,0.15)",
  },
  eventStripe: {
    width: 3,
    height: 28,
    borderRadius: 2,
    flexShrink: 0,
  },
  eventName: {
    fontSize: "0.88rem",
    fontWeight: 600,
  },
  eventDate: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    color: "#5c5040",
  },
  liveDot: {
    marginLeft: "auto",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.6rem",
    fontWeight: 700,
    color: "#c94a3a",
    letterSpacing: "0.08em",
    background: "rgba(201,74,58,0.12)",
    padding: "2px 8px",
    borderRadius: 4,
  },
  filterChips: {
    display: "flex",
    gap: 4,
  },
  chipActive: {
    padding: "3px 10px",
    borderRadius: 4,
    background: "rgba(201,163,74,0.1)",
    color: "#c9a34a",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  chip: {
    padding: "3px 10px",
    borderRadius: 4,
    background: "rgba(255,255,255,0.03)",
    color: "#5c5040",
    fontSize: "0.7rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  newsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  newsItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: "0.85rem",
    display: "block",
  },
  newsTime: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.7rem",
    color: "#5c5040",
  },
  pinIcon: {
    color: "#c9a34a",
    fontSize: "0.9rem",
  },
  leaderboard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  lbRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "6px 0",
  },
  lbRank: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#5c5040",
    width: 24,
    textAlign: "center" as const,
  },
  lbRankGold: { color: "#e4c778" },
  lbRankSilver: { color: "#c0c0c0" },
  lbRankBronze: { color: "#b48250" },
  lbName: {
    fontSize: "0.85rem",
    width: 140,
    flexShrink: 0,
  },
  lbBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    background: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  lbFill: {
    height: "100%",
    borderRadius: 3,
    background: "linear-gradient(90deg, #c9a34a66, #c9a34a)",
  },
  lbScore: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.78rem",
    fontWeight: 500,
    color: "#c9a34a",
    width: 50,
    textAlign: "right" as const,
  },
  actionsCard: {
    gridColumn: "span 2",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(12,14,18,0.8)",
    padding: "18px 20px",
  },
  actionPills: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 12,
  },
  actionPill: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.02)",
    color: "#7a6e5a",
    fontSize: "0.82rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  actionIcon: {
    fontSize: "1rem",
  },
  bannerBento: {
    gridColumn: "span 2",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
    position: "relative" as const,
    minHeight: 120,
  },
  bannerImg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.5,
  },
  bannerOverlay: {
    position: "absolute" as const,
    inset: 0,
    background: "linear-gradient(90deg, rgba(8,9,12,0.9) 0%, rgba(8,9,12,0.4) 100%)",
  },
  bannerContent: {
    position: "relative" as const,
    zIndex: 1,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    height: "100%",
  },
  bannerTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.65rem",
    color: "#c9a34a",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f2e6c9",
  },
  bannerDate: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    color: "#5c5040",
    marginTop: 4,
  },
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.04)",
    marginTop: 24,
  },
  footerInner: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerMono: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    color: "#5c5040",
    letterSpacing: "0.04em",
  },
  footerText: {
    fontSize: "0.78rem",
    color: "#3a3020",
  },
  backLink: {
    position: "fixed" as const,
    bottom: 20,
    left: 20,
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(8,9,12,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e4c778",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    zIndex: 200,
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
  },
};

export default RedesignV3Page;
