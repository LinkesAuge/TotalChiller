"use client";

import { useState } from "react";

/**
 * V1C: "Fortress Tower" — Slim, modern sidebar with smooth animations.
 *
 * Collapsed = thin rail with small square icons, tooltip on hover.
 * Expanded = clean labels, grouped with minimal dividers.
 * Features a clan banner at top that shrinks on collapse,
 * and a compact user card at the bottom. More refined/modern take
 * while keeping the Fortress medieval gold palette.
 */

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly group: string;
  readonly active?: boolean;
  readonly badge?: number;
}

const NAV: readonly NavItem[] = [
  { group: "core", label: "Dashboard", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", active: true },
  {
    group: "core",
    label: "News",
    icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2",
    badge: 2,
  },
  {
    group: "core",
    label: "Events",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  { group: "core", label: "Messages", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z", badge: 5 },
  { group: "data", label: "Charts", icon: "M18 20V10M12 20V4M6 20v-6" },
  { group: "data", label: "Chest DB", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { group: "data", label: "Import", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
  {
    group: "admin",
    label: "Admin",
    icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  { group: "admin", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  {
    group: "admin",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

const GROUPS = ["core", "data", "admin"] as const;

function RedesignV1CPage(): JSX.Element {
  const [open, setOpen] = useState<boolean>(true);
  const w = open ? 220 : 56;

  return (
    <div style={c.page}>
      <style>{`
        @font-face { font-family: 'Fontin Sans'; src: url('/fonts/fontin_sans_cr_sc_regular.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .v1c-sb { transition: width 0.2s cubic-bezier(0.4,0,0.2,1); }
        .v1c-main { transition: margin-left 0.2s cubic-bezier(0.4,0,0.2,1); }
        .v1c-link:hover { background: rgba(201,163,74,0.1); color: #e4c778; }
        .v1c-link { transition: all 0.12s ease; position: relative; }
        .v1c-link:hover::after { content: attr(data-tip); position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%); background: rgba(10,18,28,0.95); border: 1px solid rgba(201,163,74,0.3); color: #e4c778; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; z-index: 200; pointer-events: none; }
        .v1c-toggle:hover { color: #e4c778; background: rgba(201,163,74,0.1); }
      `}</style>

      {/* === SIDEBAR === */}
      <aside className="v1c-sb" style={{ ...c.sb, width: w }}>
        {/* Logo area */}
        <div
          style={{
            ...c.logoArea,
            padding: open ? "14px 14px 10px" : "14px 8px 10px",
            justifyContent: open ? "flex-start" : "center",
          }}
        >
          <img
            src="/assets/ui/components_shield_4.png"
            alt=""
            style={{ width: 28, height: 28, objectFit: "contain" as const, flexShrink: 0 }}
          />
          {open && <span style={c.logoT}>The Chillers</span>}
        </div>

        {/* Clan context */}
        {open && (
          <div style={c.clanCtx}>
            <div style={c.clanDot} />
            <span style={c.clanN}>Alpha Division</span>
            <span style={c.clanRole}>Officer</span>
          </div>
        )}

        {/* Nav */}
        <nav style={c.nav}>
          {GROUPS.map((group, gi) => {
            const items = NAV.filter((n) => n.group === group);
            return (
              <div key={group}>
                {gi > 0 && <div style={c.sep} />}
                {items.map((item, i) => (
                  <a
                    key={i}
                    href="#"
                    className="v1c-link"
                    data-tip={!open ? item.label : undefined}
                    style={{
                      ...c.link,
                      ...(item.active ? c.linkActive : {}),
                      padding: open ? "7px 12px" : "7px 0",
                      justifyContent: open ? "flex-start" : "center",
                    }}
                  >
                    <span style={{ ...c.ico, color: item.active ? "#e4c778" : "#5c5040" }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={item.icon} />
                      </svg>
                    </span>
                    {open && <span style={c.lbl}>{item.label}</span>}
                    {item.badge !== undefined && (
                      <span
                        style={{
                          ...c.bdg,
                          ...(open
                            ? { marginLeft: "auto" }
                            : {
                                position: "absolute" as const,
                                top: 2,
                                right: 2,
                                minWidth: 14,
                                height: 14,
                                fontSize: "0.5rem",
                              }),
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Toggle + user */}
        <div style={c.sbBottom}>
          <button
            onClick={() => setOpen(!open)}
            style={{ ...c.toggleBtn, justifyContent: open ? "flex-start" : "center" }}
            className="v1c-toggle"
            aria-label="Toggle"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              {open ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
            </svg>
            {open && <span style={{ fontSize: "0.72rem" }}>Collapse</span>}
          </button>
          <div style={{ ...c.usr, justifyContent: open ? "flex-start" : "center" }}>
            <div style={c.av}>DK</div>
            {open && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f2e6c9" }}>DragonKnight99</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* === CONTENT === */}
      <div className="v1c-main" style={{ ...c.main, marginLeft: w }}>
        <header style={c.hdr}>
          <h1 style={c.hdrT}>Community Hub</h1>
          <div style={c.hdrA}>
            <div style={{ position: "relative" as const, cursor: "pointer" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span
                style={{
                  position: "absolute" as const,
                  top: -5,
                  right: -5,
                  background: "#c94a3a",
                  color: "#fff",
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                3
              </span>
            </div>
            <button style={c.cta}>New Post</button>
          </div>
        </header>

        {/* Hero */}
        <div style={c.hero}>
          <div
            style={{
              position: "absolute" as const,
              inset: 0,
              background: "linear-gradient(180deg, rgba(8,13,20,0.3), rgba(8,13,20,0.85))",
              zIndex: 1,
            }}
          />
          <img
            src="/assets/banners/banner_gold_dragon.png"
            alt=""
            style={{
              position: "absolute" as const,
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover" as const,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: "relative" as const,
              zIndex: 2,
              textAlign: "center" as const,
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: 4,
            }}
          >
            <img src="/assets/ui/decor_line_1.png" alt="" style={{ width: 140, opacity: 0.5 }} />
            <h2
              style={{
                fontFamily: "'Fontin Sans', serif",
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "#e4c778",
                textTransform: "uppercase" as const,
                margin: 0,
                letterSpacing: "0.06em",
              }}
            >
              Community Hub
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "#9a8b6f",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                margin: 0,
              }}
            >
              Coordinated. Competitive. Welcoming.
            </p>
            <img
              src="/assets/ui/decor_line_1.png"
              alt=""
              style={{ width: 140, opacity: 0.5, transform: "scaleY(-1)" }}
            />
          </div>
        </div>

        {/* Grid */}
        <div style={c.grid}>
          <section
            style={{
              gridColumn: "span 2",
              background: "linear-gradient(180deg, #e8dcc4, #d8cab0)",
              border: "2px solid #b5a07a",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                background: "linear-gradient(180deg, #5a4325, #3d2d12)",
                borderBottom: "2px solid #8a6d2f",
              }}
            >
              <img
                src="/assets/ui/icon_swords.png"
                alt=""
                style={{ width: 20, height: 20, objectFit: "contain" as const }}
              />
              <h3
                style={{
                  fontFamily: "'Fontin Sans', serif",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#e4c778",
                  flex: 1,
                  margin: 0,
                }}
              >
                Announcements
              </h3>
            </div>
            <div style={{ padding: "10px 16px", color: "#3a3020" }}>
              {["War prep tonight at 21:00", "Chest upload deadline Friday", "Tournament registrations open"].map(
                (t, i) => (
                  <div key={i}>
                    {i > 0 && (
                      <div
                        style={{ height: 1, background: "linear-gradient(90deg, transparent, #b5a07a, transparent)" }}
                      />
                    )}
                    <div
                      style={{ padding: "8px 0", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span style={{ color: "#8a6d2f" }}>&#9733;</span>
                      {t}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section
            style={{
              gridColumn: "span 2",
              background: "linear-gradient(180deg, rgba(22,44,66,0.95), rgba(14,30,45,0.95))",
              border: "2px solid rgba(201,163,74,0.5)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(201,163,74,0.3)" }}>
              <h3
                style={{
                  fontFamily: "'Fontin Sans', serif",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "#e4c778",
                  margin: 0,
                }}
              >
                Quick Stats
              </h3>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 1,
                background: "rgba(201,163,74,0.15)",
              }}
            >
              {[
                { v: "12,450", l: "Personal" },
                { v: "210,980", l: "Clan" },
                { v: "78/90", l: "Chests" },
                { v: "86%", l: "Ready" },
              ].map((s2, i) => (
                <div
                  key={i}
                  style={{ background: "rgba(10,21,32,0.8)", padding: "14px 10px", textAlign: "center" as const }}
                >
                  <div
                    style={{
                      fontFamily: "'Fontin Sans', serif",
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "#e4c778",
                    }}
                  >
                    {s2.v}
                  </div>
                  <div
                    style={{ fontSize: "0.68rem", color: "#9a8b6f", marginTop: 2, textTransform: "uppercase" as const }}
                  >
                    {s2.l}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))",
              border: "1px solid rgba(45,80,115,0.5)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(45,80,115,0.4)" }}>
              <h3
                style={{
                  fontFamily: "'Fontin Sans', serif",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#e4c778",
                  margin: 0,
                }}
              >
                News Feed
              </h3>
            </div>
            {["Recruitment opens", "Alliance update", "War highlights"].map((t, i) => (
              <div
                key={i}
                style={{ padding: "9px 16px", borderBottom: "1px solid rgba(45,80,115,0.2)", fontSize: "0.88rem" }}
              >
                {t}
              </div>
            ))}
          </section>

          <section
            style={{
              background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))",
              border: "1px solid rgba(45,80,115,0.5)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <img
              src="/assets/banners/banner_ragnarok_clan_event_708x123.png"
              alt=""
              style={{ width: "100%", height: 56, objectFit: "cover" as const, opacity: 0.7 }}
            />
            <div style={{ padding: "10px 16px" }}>
              <h3
                style={{
                  fontFamily: "'Fontin Sans', serif",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#e4c778",
                  margin: "0 0 8px",
                }}
              >
                Events
              </h3>
              {[
                { n: "War Prep", d: "Today 20:30", cl: "#c94a3a" },
                { n: "Guild Meeting", d: "Feb 5", cl: "#4a6ea0" },
                { n: "Training", d: "Feb 18", cl: "#4a9960" },
              ].map((e, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: "0.85rem" }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.cl }} />
                  <span style={{ flex: 1 }}>{e.n}</span>
                  <span style={{ fontSize: "0.7rem", color: "#9a8b6f" }}>{e.d}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer style={{ padding: "20px 24px", textAlign: "center" as const }}>
          <span style={{ color: "#5c5040", fontSize: "0.78rem" }}>The Chillers &bull; Community Hub</span>
        </footer>
      </div>

      <a href="/redesign" style={c.back}>
        &larr; Back to versions
      </a>
    </div>
  );
}

const c: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Fontin Sans', 'Inter', serif",
    background: "#080d14",
    backgroundImage: "radial-gradient(ellipse at 30% 0%, #152238 0%, #0a1220 50%, #080d14 100%)",
    backgroundAttachment: "fixed",
    color: "#f2e6c9",
    minHeight: "100vh",
  },
  sb: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    height: "100vh",
    background: "linear-gradient(180deg, rgba(10,17,26,0.99), rgba(6,10,16,1))",
    borderRight: "1px solid rgba(201,163,74,0.25)",
    boxShadow: "3px 0 20px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column" as const,
    zIndex: 100,
    overflow: "hidden",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid rgba(201,163,74,0.15)",
    flexShrink: 0,
  },
  logoT: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#e4c778",
    whiteSpace: "nowrap" as const,
    textShadow: "0 0 12px rgba(228,199,120,0.2)",
  },
  clanCtx: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    fontSize: "0.72rem",
    color: "#7a6e5a",
    borderBottom: "1px solid rgba(201,163,74,0.1)",
    flexShrink: 0,
  },
  clanDot: { width: 6, height: 6, borderRadius: "50%", background: "#4a9960", flexShrink: 0 },
  clanN: { flex: 1 },
  clanRole: { color: "#c9a34a", fontWeight: 600 },
  nav: { flex: 1, overflowY: "auto" as const, padding: "6px 6px" },
  sep: { height: 1, background: "rgba(201,163,74,0.12)", margin: "6px 8px" },
  link: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "#7a6e5a",
    borderRadius: 6,
    fontSize: "0.82rem",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
  },
  linkActive: { background: "rgba(201,163,74,0.1)", color: "#e4c778", borderLeft: "2px solid #c9a34a" },
  ico: { width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  lbl: { overflow: "hidden", textOverflow: "ellipsis" },
  bdg: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    background: "#c94a3a",
    color: "#fff",
    fontSize: "0.55rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
    flexShrink: 0,
  },
  sbBottom: { flexShrink: 0, padding: "8px 6px 10px", borderTop: "1px solid rgba(201,163,74,0.12)" },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    padding: "5px 8px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#5c5040",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 500,
    transition: "all 0.12s",
    marginBottom: 6,
  },
  usr: { display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, overflow: "hidden" },
  av: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(180deg, rgba(201,163,74,0.2), rgba(138,109,47,0.12))",
    border: "1.5px solid #c9a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#e4c778",
    fontSize: "0.65rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  main: { minHeight: "100vh" },
  hdr: {
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(201,163,74,0.12)",
  },
  hdrT: { fontFamily: "'Fontin Sans', serif", fontSize: "1.2rem", fontWeight: 700, color: "#e4c778", margin: 0 },
  hdrA: { display: "flex", alignItems: "center", gap: 12 },
  cta: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid rgba(201,163,74,0.4)",
    background: "linear-gradient(180deg, rgba(201,163,74,0.12), rgba(201,163,74,0.04))",
    color: "#e4c778",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  hero: {
    position: "relative" as const,
    height: 130,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  grid: { padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  back: {
    position: "fixed" as const,
    bottom: 20,
    right: 20,
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(10,21,32,0.9)",
    border: "1px solid rgba(201,163,74,0.4)",
    color: "#e4c778",
    textDecoration: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    zIndex: 200,
  },
};

export default RedesignV1CPage;
