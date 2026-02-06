"use client";

import Link from "next/link";

interface VersionCard {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly color: string;
  readonly features: readonly string[];
  readonly fontNote: string;
  readonly assetNote: string;
}

const VERSIONS: readonly VersionCard[] = [
  {
    id: "v3a",
    name: "Sanctum Refined",
    subtitle: "Sidebar Polish",
    description:
      "Focused sidebar refinement: improved collapsed state with persistent gold left-border on active item, hover glow behind nav icons, online status indicator on avatar, VIP crown badge, and clan online count in the header.",
    tags: ["Sidebar Focus", "Hover Glow", "Online Status"],
    color: "#c9a34a",
    features: [
      "Gold left-border accent on active nav (visible even when collapsed)",
      "Radial hover glow behind nav icons on mouseover",
      "Green online status dot on user avatar",
      "VIP crown icon next to username",
      "Clan online count (12 online) in sidebar header",
      "Cards lift on hover with gold border highlight",
      "All Sanctum assets preserved (steel texture, arrow nav, scepter dividers)",
    ],
    fontNote: "Fontin Sans headings, Inter body — same as Sanctum",
    assetNote:
      "Same 14+ VIP assets as Sanctum + VIP crown badge, refined hover interactions",
  },
  {
    id: "v3b",
    name: "Sanctum Enriched",
    subtitle: "Content Polish",
    description:
      "Content-area refinement: announcements now show author + timestamp, stats display trend arrows (▲/▼), news has read/unread state, events have countdown badges, and a Quick Actions toolbar is added with leather-textured game buttons.",
    tags: ["Content Focus", "Trend Arrows", "Quick Actions"],
    color: "#8a6d2f",
    features: [
      "Announcements: author name + relative timestamp per item",
      "Stat cards: trend arrows (▲ +8%, ▼ -2%) with color coding",
      "News feed: unread dot indicator + relative timestamps",
      "Events: countdown badges (in 2h, Tomorrow, 12 days)",
      "Quick Actions toolbar: Upload CSV, Review Rules, Event Calendar",
      "Breadcrumb trail in top bar (The Chillers > Alpha Division)",
      "Richer footer with ornate decor divider",
      "Sidebar identical to Sanctum base",
    ],
    fontNote: "Fontin Sans headings, Inter body — same as Sanctum",
    assetNote:
      "Same 14+ VIP assets + leather-textured action buttons (backs_1), ornate footer divider (components_decor_5)",
  },
  {
    id: "v3c",
    name: "Sanctum Complete",
    subtitle: "Full Polish — Sidebar + Content",
    description:
      "The best of both worlds: combines V3A sidebar polish (hover glow, online status, VIP crown, gold borders) with V3B content polish (timestamps, trends, quick actions, countdowns). Plus: tab group on News feed (All/Clan/Global).",
    tags: ["Full Polish", "Tab Groups", "Best of Both"],
    color: "#4a6ea0",
    features: [
      "All V3A sidebar refinements (glow, status, crown, gold borders)",
      "All V3B content refinements (timestamps, trends, actions, countdowns)",
      "News feed tab group: All / Clan / Global filter buttons",
      "Cards lift on hover with gold border highlight",
      "Breadcrumb trail + clan context in top bar",
      "Full ornate footer with divider and tagline",
      "Every VIP game asset used appropriately throughout",
    ],
    fontNote: "Fontin Sans headings, Inter body — same as Sanctum",
    assetNote:
      "All Sanctum VIP assets + crown, leather action buttons, ornate footer, tab styling — maximum refinement",
  },
] as const;

/**
 * Version selector page for the UI/UX redesign exploration.
 * Shows three design concepts with descriptions and links to full previews.
 */
function RedesignSelectorPage(): JSX.Element {
  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        .version-card:hover { border-color: var(--hover-color); transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .version-card { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); cursor: pointer; }
        .view-btn:hover { background: var(--btn-bg-hover); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.breadcrumb}>
              <Link href="/" style={styles.breadcrumbLink}>TotalChiller</Link>
              <span style={styles.breadcrumbSep}>/</span>
              <span style={styles.breadcrumbCurrent}>UI Redesign</span>
            </div>
            <h1 style={styles.title}>Sanctum Refinements</h1>
            <p style={styles.subtitle}>
              Three polish iterations of the Fortress Sanctum design.
              Each targets different areas: sidebar, content, or both combined.
            </p>
          </div>
          <div style={styles.headerMeta}>
            <span style={styles.branchTag}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a9960" strokeWidth="2"><path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9" /></svg>
              ui-redesign-exploration
            </span>
            <span style={styles.dateTag}>Feb 2026</span>
          </div>
        </div>
      </header>

      {/* Version cards */}
      <div style={styles.grid}>
        {VERSIONS.map((version, index) => (
          <Link
            key={version.id}
            href={`/redesign/${version.id}`}
            style={{
              ...styles.card,
              ["--hover-color" as string]: `${version.color}66`,
              animationDelay: `${index * 0.1}s`,
            }}
            className="version-card"
          >
            {/* Color accent line */}
            <div style={{ ...styles.accentLine, background: `linear-gradient(90deg, ${version.color}, transparent)` }} />

            {/* Version header */}
            <div style={styles.cardHeader}>
              <div style={styles.versionNumber}>
                <span style={{ ...styles.vNum, color: version.color }}>{version.id.toUpperCase()}</span>
              </div>
              <div style={styles.versionMeta}>
                <h2 style={styles.versionName}>{version.name}</h2>
                <span style={styles.versionSub}>{version.subtitle}</span>
              </div>
            </div>

            {/* Tags */}
            <div style={styles.tags}>
              {version.tags.map((tag) => (
                <span key={tag} style={{ ...styles.tag, borderColor: `${version.color}44`, color: version.color }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <p style={styles.description}>{version.description}</p>

            {/* Features */}
            <div style={styles.featureSection}>
              <div style={styles.featureLabel}>Key Features</div>
              <ul style={styles.featureList}>
                {version.features.map((feat) => (
                  <li key={feat} style={styles.featureItem}>
                    <span style={{ ...styles.featureDot, background: version.color }} />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            <div style={styles.notes}>
              <div style={styles.noteRow}>
                <span style={styles.noteIcon}>Aa</span>
                <span style={styles.noteText}>{version.fontNote}</span>
              </div>
              <div style={styles.noteRow}>
                <span style={styles.noteIcon}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                </span>
                <span style={styles.noteText}>{version.assetNote}</span>
              </div>
            </div>

            {/* CTA */}
            <div
              style={{
                ...styles.viewBtn,
                ["--btn-bg-hover" as string]: `${version.color}22`,
                borderColor: `${version.color}44`,
                color: version.color,
              }}
              className="view-btn"
            >
              View Full Preview
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Comprehensive preview link */}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/redesign/preview" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, background: "linear-gradient(180deg, rgba(201,163,74,0.15), rgba(138,109,47,0.08))", border: "1px solid rgba(201,163,74,0.5)", color: "#e4c778", textDecoration: "none", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.02em" }}>
          View Full Design System Preview
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>

      {/* Footer note */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Sanctum Complete (V3C) is the chosen design. The preview above shows every UI pattern.
          <br />Fortress Sanctum (V2B) and Fortress Tower (V1C) are preserved as backups.
        </p>
        <div style={styles.footerLinks}>
          <Link href="/" style={styles.footerLink}>
            &larr; Back to main app
          </Link>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    background: "#060810",
    color: "#e0d8ca",
    minHeight: "100vh",
    padding: "0 0 48px",
  },
  header: {
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "linear-gradient(180deg, rgba(12,16,24,0.95) 0%, rgba(6,8,16,0) 100%)",
    padding: "40px 0 32px",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    fontSize: "0.82rem",
  },
  breadcrumbLink: {
    color: "#5c5040",
    textDecoration: "none",
  },
  breadcrumbSep: {
    color: "#3a3020",
  },
  breadcrumbCurrent: {
    color: "#9a8b6f",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#f2e6c9",
    letterSpacing: "-0.02em",
    margin: "0 0 8px 0",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#7a6e5a",
    maxWidth: 500,
    lineHeight: 1.6,
    margin: 0,
  },
  headerMeta: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 20,
  },
  branchTag: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.75rem",
    color: "#4a9960",
    background: "rgba(74,153,96,0.08)",
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid rgba(74,153,96,0.15)",
  },
  dateTag: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.72rem",
    color: "#5c5040",
  },
  grid: {
    maxWidth: 1200,
    margin: "32px auto 0",
    padding: "0 32px",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
  },
  card: {
    display: "flex",
    flexDirection: "column" as const,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(10,14,20,0.8)",
    overflow: "hidden",
    textDecoration: "none",
    color: "inherit",
    animation: "fadeUp 0.5s ease-out both",
  },
  accentLine: {
    height: 3,
    width: "100%",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "20px 22px 0",
  },
  versionNumber: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  vNum: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },
  versionMeta: {},
  versionName: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#f2e6c9",
    margin: 0,
  },
  versionSub: {
    fontSize: "0.78rem",
    color: "#7a6e5a",
    marginTop: 2,
    display: "block",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    padding: "14px 22px 0",
  },
  tag: {
    padding: "3px 10px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: "0.68rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  description: {
    padding: "14px 22px 0",
    fontSize: "0.88rem",
    color: "#9a8b6f",
    lineHeight: 1.6,
    margin: 0,
  },
  featureSection: {
    padding: "16px 22px 0",
  },
  featureLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#5c5040",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 8,
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    fontSize: "0.8rem",
    color: "#b8a88a",
    lineHeight: 1.4,
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 6,
  },
  notes: {
    padding: "16px 22px 0",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  noteRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  noteIcon: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#5c5040",
    width: 20,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  noteText: {
    fontSize: "0.75rem",
    color: "#7a6e5a",
    lineHeight: 1.5,
  },
  viewBtn: {
    margin: "auto 22px 22px",
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px 20px",
    borderRadius: 10,
    border: "1px solid",
    background: "transparent",
    fontSize: "0.88rem",
    fontWeight: 600,
    textAlign: "center" as const,
    transition: "background 0.15s, border-color 0.15s",
  },
  footer: {
    maxWidth: 1200,
    margin: "40px auto 0",
    padding: "0 32px",
    textAlign: "center" as const,
  },
  footerText: {
    fontSize: "0.85rem",
    color: "#5c5040",
    lineHeight: 1.6,
    maxWidth: 600,
    margin: "0 auto",
  },
  footerLinks: {
    marginTop: 16,
  },
  footerLink: {
    color: "#9a8b6f",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 500,
  },
};

export default RedesignSelectorPage;
