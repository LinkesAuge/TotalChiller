"use client";

import { useState } from "react";

/**
 * V2A: "Fortress Armory" — Fortress Tower sidebar + heavy VIP asset integration.
 *
 * - Golden eagle emblem (components_decor_12) as clan logo
 * - Gold ornate divider (components_decor_5) between sidebar sections
 * - Teal circle frames (back_rang_small) around nav icons when collapsed
 * - Victory banner (batler_back_victory_1) as card headers
 * - Game progress bars (battler_stage_bar_empty/full) for progress
 * - Chest icons, star icons, crown VIP badge, stat icons throughout
 * - Header bar (header.png) as top bar background
 */

interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly group: string;
  readonly active?: boolean;
  readonly badge?: number;
  readonly vipIcon?: string;
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
  { group: "data", label: "Chest DB", icon: "", vipIcon: "/assets/vip/icons_chest_1.png" },
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
const GROUP_LABELS: Record<string, string> = { core: "Main", data: "Data", admin: "Management" };

function RedesignV2APage(): JSX.Element {
  const [open, setOpen] = useState<boolean>(true);
  const w = open ? 240 : 62;

  return (
    <div style={p.page}>
      <style>{`
        @font-face { font-family: 'Fontin Sans'; src: url('/fonts/fontin_sans_cr_sc_regular.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .v2a-sb { transition: width 0.25s cubic-bezier(0.4,0,0.2,1); }
        .v2a-main { transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1); }
        .v2a-link:hover { background: rgba(201,163,74,0.12); }
        .v2a-link:hover .v2a-frame { filter: brightness(1.3); box-shadow: 0 0 8px rgba(201,163,74,0.3); }
        .v2a-link { transition: all 0.15s ease; position: relative; }
        .v2a-link:hover::after { content: attr(data-tip); position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%); background: rgba(10,18,28,0.95); border: 1px solid rgba(201,163,74,0.3); color: #e4c778; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; z-index: 200; pointer-events: none; }
        .v2a-toggle:hover { filter: brightness(1.3); }
        .v2a-bar-fill { background-size: cover; background-position: center; }
      `}</style>

      {/* === SIDEBAR === */}
      <aside className="v2a-sb" style={{ ...p.sb, width: w }}>
        {/* Clan emblem — golden eagle */}
        <div
          style={{
            ...p.logoArea,
            flexDirection: open ? ("row" as const) : ("column" as const),
            padding: open ? "14px 14px 8px" : "14px 6px 8px",
          }}
        >
          <img
            src="/assets/vip/components_decor_12.png"
            alt="Clan"
            style={{
              width: open ? 48 : 38,
              height: "auto",
              objectFit: "contain" as const,
              flexShrink: 0,
              filter: "drop-shadow(0 2px 6px rgba(201,163,74,0.4))",
            }}
          />
          {open && (
            <div style={{ overflow: "hidden" }}>
              <div style={p.logoT}>The Chillers</div>
              <div style={{ fontSize: "0.65rem", color: "#7a6e5a", display: "flex", alignItems: "center", gap: 4 }}>
                <img src="/assets/vip/button_vip_crown_22x33.png" alt="" style={{ width: 10, height: "auto" }} />
                Alpha Division
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={p.nav}>
          {GROUPS.map((group, gi) => {
            const items = NAV.filter((n) => n.group === group);
            return (
              <div key={group}>
                {/* Gold ornate divider between sections */}
                {gi > 0 && (
                  <div style={{ padding: open ? "4px 8px" : "4px 2px", display: "flex", justifyContent: "center" }}>
                    <img
                      src="/assets/vip/components_decor_5.png"
                      alt=""
                      style={{ width: open ? "80%" : 40, height: "auto", opacity: 0.5 }}
                    />
                  </div>
                )}
                {open && <div style={p.secLabel}>{GROUP_LABELS[group]}</div>}
                {items.map((item, i) => (
                  <a
                    key={i}
                    href="#"
                    className="v2a-link"
                    data-tip={!open ? item.label : undefined}
                    style={{
                      ...p.navItem,
                      ...(item.active ? p.navActive : {}),
                      padding: open ? "6px 10px" : "6px 0",
                      justifyContent: open ? "flex-start" : "center",
                    }}
                  >
                    {/* Teal circle frame for icon */}
                    <div className="v2a-frame" style={p.iconFrame}>
                      <img src="/assets/vip/back_rang_small.png" alt="" style={p.frameBg} />
                      {item.vipIcon ? (
                        <img
                          src={item.vipIcon}
                          alt=""
                          style={{
                            width: 16,
                            height: 16,
                            objectFit: "contain" as const,
                            position: "relative" as const,
                            zIndex: 1,
                          }}
                        />
                      ) : (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={item.active ? "#e4c778" : "#9ab8d0"}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ position: "relative" as const, zIndex: 1 }}
                        >
                          <path d={item.icon} />
                        </svg>
                      )}
                    </div>
                    {open && (
                      <span style={{ ...p.navLabel, color: item.active ? "#e4c778" : "#9a8b6f" }}>{item.label}</span>
                    )}
                    {item.badge !== undefined && (
                      <span
                        style={{
                          ...p.badge,
                          ...(open
                            ? { marginLeft: "auto" }
                            : {
                                position: "absolute" as const,
                                top: 0,
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

        {/* Bottom: toggle + user */}
        <div style={p.sbBot}>
          <img
            src="/assets/vip/components_decor_6.png"
            alt=""
            style={{ width: "80%", height: "auto", opacity: 0.35, margin: "0 auto 6px", display: "block" }}
          />
          <button
            onClick={() => setOpen(!open)}
            style={{ ...p.togBtn, justifyContent: open ? "flex-start" : "center" }}
            className="v2a-toggle"
            aria-label="Toggle"
          >
            <img
              src={open ? "/assets/vip/button_arrow_up_5.png" : "/assets/vip/button_arrow_up_6.png"}
              alt=""
              style={{
                width: 16,
                height: 16,
                objectFit: "contain" as const,
                transform: open ? "rotate(-90deg)" : "rotate(90deg)",
              }}
            />
            {open && <span style={{ fontSize: "0.72rem", color: "#7a6e5a" }}>Collapse</span>}
          </button>
          <div style={{ ...p.userRow, justifyContent: open ? "flex-start" : "center" }}>
            <div style={p.avatarWrap}>
              <img src="/assets/vip/back_rang_small.png" alt="" style={{ ...p.frameBg, borderRadius: "50%" }} />
              <span style={p.avatarText}>DK</span>
            </div>
            {open && (
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#f2e6c9",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  DragonKnight99
                  <img src="/assets/vip/button_vip_crown_22x33.png" alt="VIP" style={{ width: 10, height: "auto" }} />
                </div>
                <div style={{ fontSize: "0.65rem", color: "#7a6e5a" }}>Officer</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* === CONTENT === */}
      <div className="v2a-main" style={{ ...p.main, marginLeft: w }}>
        {/* Top bar with game header texture */}
        <header style={p.topBar}>
          <img src="/assets/vip/header.png" alt="" style={p.topBarBg} />
          <div style={p.topBarContent}>
            <h1 style={p.topTitle}>Community Hub</h1>
            <div style={p.topActions}>
              <div style={{ position: "relative" as const, cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <span style={p.notifDot}>3</span>
              </div>
              <button style={p.goldBtn}>New Post</button>
            </div>
          </div>
        </header>

        {/* Hero with game banner */}
        <div style={p.hero}>
          <div
            style={{
              position: "absolute" as const,
              inset: 0,
              background: "linear-gradient(180deg, rgba(8,13,20,0.2), rgba(8,13,20,0.85))",
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
            <img src="/assets/vip/components_decor_5.png" alt="" style={{ width: 180, opacity: 0.6 }} />
            <h2
              style={{
                fontFamily: "'Fontin Sans', serif",
                fontSize: "1.6rem",
                fontWeight: 700,
                color: "#e4c778",
                textTransform: "uppercase" as const,
                margin: 0,
                letterSpacing: "0.06em",
                textShadow: "0 2px 16px rgba(201,163,74,0.4)",
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
              src="/assets/vip/components_decor_5.png"
              alt=""
              style={{ width: 180, opacity: 0.6, transform: "scaleY(-1)" }}
            />
          </div>
        </div>

        <div style={p.grid}>
          {/* Announcements with victory banner header */}
          <section style={{ ...p.card, gridColumn: "span 2" }}>
            <div style={p.cardHead}>
              <img src="/assets/vip/batler_back_victory_1.png" alt="" style={p.cardHeadBg} />
              <div style={p.cardHeadContent}>
                <img src="/assets/vip/batler_icons_stat_damage.png" alt="" style={{ width: 18, height: 18 }} />
                <h3 style={p.cardTitle}>Announcements</h3>
                <span style={p.pinBadge}>Pinned</span>
              </div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {[
                { text: "War prep tonight at 21:00 — full attendance required", tag: "Priority", color: "#c94a3a" },
                { text: "Chest upload deadline this Friday", tag: "Info", color: "#4a6ea0" },
                { text: "Alliance tournament registrations open", tag: "New", color: "#4a9960" },
              ].map((item, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.3), transparent)",
                      }}
                    />
                  )}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", fontSize: "0.88rem" }}
                  >
                    <img src="/assets/vip/batler_icons_star_4.png" alt="" style={{ width: 14, height: 14 }} />
                    <span style={{ flex: 1 }}>{item.text}</span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 14,
                        background: `linear-gradient(180deg, ${item.color}, ${item.color}cc)`,
                        color: "#fff",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats with game icons */}
          <section style={{ ...p.card, gridColumn: "span 2" }}>
            <div style={p.cardHead}>
              <img src="/assets/vip/batler_back_victory_1.png" alt="" style={p.cardHeadBg} />
              <div style={p.cardHeadContent}>
                <img src="/assets/vip/icons_chest_1.png" alt="" style={{ width: 20, height: 18 }} />
                <h3 style={p.cardTitle}>Quick Stats</h3>
              </div>
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
                { v: "12,450", l: "Personal Score", ico: "/assets/vip/batler_icons_stat_damage.png" },
                { v: "210,980", l: "Clan Score", ico: "/assets/vip/batler_icons_stat_armor.png" },
                { v: "78/90", l: "Chest Submissions", ico: "/assets/vip/icons_chest_2.png" },
                { v: "86%", l: "Event Readiness", ico: "/assets/vip/batler_icons_stat_heal.png" },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{ background: "rgba(10,21,32,0.8)", padding: "14px 10px", textAlign: "center" as const }}
                >
                  <img
                    src={stat.ico}
                    alt=""
                    style={{
                      width: 18,
                      height: 18,
                      margin: "0 auto 4px",
                      display: "block",
                      objectFit: "contain" as const,
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "'Fontin Sans', serif",
                      fontSize: "1.2rem",
                      fontWeight: 700,
                      color: "#e4c778",
                    }}
                  >
                    {stat.v}
                  </div>
                  <div
                    style={{ fontSize: "0.65rem", color: "#9a8b6f", marginTop: 2, textTransform: "uppercase" as const }}
                  >
                    {stat.l}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* News */}
          <section style={p.card}>
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
            {["Recruitment opens this week", "Alliance update posted", "War highlights published"].map((t, i) => (
              <div
                key={i}
                style={{
                  padding: "9px 16px",
                  borderBottom: "1px solid rgba(45,80,115,0.2)",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src="/assets/vip/batler_icons_star_glow.png"
                  alt=""
                  style={{ width: 12, height: 12, opacity: 0.6 }}
                />
                {t}
              </div>
            ))}
          </section>

          {/* Events */}
          <section style={p.card}>
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
                { n: "War Prep", d: "Today 20:30", c: "#c94a3a" },
                { n: "Guild Meeting", d: "Feb 5", c: "#4a6ea0" },
                { n: "Training", d: "Feb 18", c: "#4a9960" },
              ].map((e, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: "0.85rem" }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.c }} />
                  <span style={{ flex: 1 }}>{e.n}</span>
                  <span style={{ fontSize: "0.7rem", color: "#9a8b6f" }}>{e.d}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Progress with game bar textures */}
          <section style={{ ...p.card, gridColumn: "span 2" }}>
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
                Clan Progress
              </h3>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {[
                { label: "Weekly Chest Target", value: 87, color: "#c9a34a" },
                { label: "Event Participation", value: 72, color: "#4a9960" },
                { label: "Member Activity", value: 94, color: "#4a6ea0" },
              ].map((bar, i) => (
                <div key={i}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.82rem",
                      color: "#9a8b6f",
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <img src="/assets/vip/batler_icons_star_4.png" alt="" style={{ width: 10, height: 10 }} />
                      {bar.label}
                    </span>
                    <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}%</span>
                  </div>
                  <div style={{ position: "relative" as const, height: 12, borderRadius: 3, overflow: "hidden" }}>
                    <img
                      src="/assets/vip/battler_stage_bar_empty.png"
                      alt=""
                      style={{
                        position: "absolute" as const,
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover" as const,
                      }}
                    />
                    <div
                      style={{
                        position: "relative" as const,
                        height: "100%",
                        width: `${bar.value}%`,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src="/assets/vip/battler_stage_bar_full.png"
                        alt=""
                        style={{
                          position: "absolute" as const,
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover" as const,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer style={{ padding: "20px 24px", textAlign: "center" as const }}>
          <img
            src="/assets/vip/components_decor_5.png"
            alt=""
            style={{ width: 120, opacity: 0.3, margin: "0 auto 8px", display: "block" }}
          />
          <span style={{ color: "#5c5040", fontSize: "0.78rem" }}>The Chillers &bull; Community Hub</span>
        </footer>
      </div>

      <a href="/redesign" style={p.back}>
        &larr; Back to versions
      </a>
    </div>
  );
}

const p: Record<string, React.CSSProperties> = {
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
    borderRight: "1px solid rgba(201,163,74,0.3)",
    boxShadow: "3px 0 24px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column" as const,
    zIndex: 100,
    overflow: "hidden",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid rgba(201,163,74,0.2)",
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
  nav: { flex: 1, overflowY: "auto" as const, padding: "4px 6px" },
  secLabel: {
    fontSize: "0.6rem",
    fontWeight: 700,
    color: "#5c5040",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    padding: "6px 10px 2px",
    whiteSpace: "nowrap" as const,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "#9a8b6f",
    borderRadius: 6,
    fontSize: "0.82rem",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
  },
  navActive: { background: "rgba(201,163,74,0.1)", color: "#e4c778" },
  iconFrame: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  frameBg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    borderRadius: "50%",
  },
  navLabel: { overflow: "hidden", textOverflow: "ellipsis" },
  badge: {
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
  sbBot: { flexShrink: 0, padding: "6px 6px 10px", borderTop: "1px solid rgba(201,163,74,0.15)" },
  togBtn: {
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
    transition: "all 0.15s",
    marginBottom: 4,
  },
  userRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, overflow: "hidden" },
  avatarWrap: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { position: "relative" as const, zIndex: 1, color: "#e4c778", fontSize: "0.6rem", fontWeight: 700 },
  main: { minHeight: "100vh" },
  topBar: { position: "relative" as const, overflow: "hidden" },
  topBarBg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.8,
  },
  topBarContent: {
    position: "relative" as const,
    zIndex: 1,
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#e4c778",
    margin: 0,
    textShadow: "0 1px 6px rgba(0,0,0,0.5)",
  },
  topActions: { display: "flex", alignItems: "center", gap: 12 },
  notifDot: {
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
  },
  goldBtn: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid rgba(201,163,74,0.5)",
    background: "linear-gradient(180deg, rgba(201,163,74,0.15), rgba(201,163,74,0.05))",
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
  card: {
    background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))",
    border: "1px solid rgba(45,80,115,0.5)",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHead: { position: "relative" as const, overflow: "hidden" },
  cardHeadBg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.6,
  },
  cardHeadContent: {
    position: "relative" as const,
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
  },
  cardTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#e4c778",
    flex: 1,
    margin: 0,
  },
  pinBadge: {
    padding: "2px 8px",
    borderRadius: 14,
    background: "rgba(201,163,74,0.2)",
    border: "1px solid #c9a34a",
    color: "#e4c778",
    fontSize: "0.6rem",
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
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

export default RedesignV2APage;
