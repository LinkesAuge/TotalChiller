"use client";

import { useState } from "react";

/**
 * V3B: "Sanctum Enriched" — Content-area polish of Fortress Sanctum.
 *
 * Refinements over V2B:
 * - News items get timestamps, type icons, and read/unread state
 * - Events get countdown-style relative time badges
 * - Quick Actions row restored with leather-textured game buttons
 * - Stats get small trend arrows (up/down indicators)
 * - Announcement items have richer formatting with time stamps
 * - Breadcrumb trail in top bar
 * - Footer with ornate decor and more detail
 * - Sidebar identical to Sanctum
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
const GROUP_LABELS: Record<string, string> = { core: "Navigation", data: "Intelligence", admin: "Command" };

function RedesignV3BPage(): JSX.Element {
  const [open, setOpen] = useState<boolean>(true);
  const w = open ? 230 : 58;

  return (
    <div style={s.page}>
      <style>{`
        @font-face { font-family: 'Fontin Sans'; src: url('/fonts/fontin_sans_cr_sc_regular.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .v3b-sb { transition: width 0.22s cubic-bezier(0.4,0,0.2,1); }
        .v3b-main { transition: margin-left 0.22s cubic-bezier(0.4,0,0.2,1); }
        .v3b-link:hover { background: rgba(201,163,74,0.08); }
        .v3b-link { transition: all 0.12s ease; position: relative; }
        .v3b-link:hover::after { content: attr(data-tip); position: absolute; left: calc(100% + 10px); top: 50%; transform: translateY(-50%); background: rgba(10,18,28,0.95); border: 1px solid rgba(201,163,74,0.3); color: #e4c778; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; white-space: nowrap; z-index: 200; pointer-events: none; }
        .v3b-toggle:hover { filter: brightness(1.3); }
        .v3b-action:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.4); border-color: rgba(201,163,74,0.5); }
        .v3b-action { transition: all 0.15s ease; }
      `}</style>

      {/* === SIDEBAR (identical to Sanctum) === */}
      <aside className="v3b-sb" style={{ ...s.sb, width: w }}>
        <img src="/assets/vip/back_left.png" alt="" style={s.sbTexture} />
        <div
          style={{
            ...s.sbHead,
            padding: open ? "14px 12px 10px" : "14px 6px 10px",
            justifyContent: open ? "flex-start" : "center",
          }}
        >
          <img
            src="/assets/ui/components_shield_4.png"
            alt=""
            style={{ width: 28, height: 28, objectFit: "contain" as const, flexShrink: 0 }}
          />
          {open && (
            <div>
              <div style={s.sbTitle}>The Chillers</div>
              <div style={{ fontSize: "0.62rem", color: "#7a6e5a" }}>Alpha Division</div>
            </div>
          )}
        </div>
        <div style={{ padding: "2px 6px", display: "flex", justifyContent: "center" }}>
          <img
            src="/assets/vip/components_decor_7.png"
            alt=""
            style={{ width: open ? "85%" : 36, height: "auto", opacity: 0.45 }}
          />
        </div>
        <nav style={s.nav}>
          {GROUPS.map((group, gi) => {
            const items = NAV.filter((n) => n.group === group);
            return (
              <div key={group}>
                {gi > 0 && (
                  <div
                    style={{
                      margin: "4px 6px",
                      height: 1,
                      background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.2), transparent)",
                    }}
                  />
                )}
                {open && <div style={s.groupLabel}>{GROUP_LABELS[group]}</div>}
                {items.map((item, i) => {
                  const isActive = Boolean(item.active);
                  return (
                    <a
                      key={i}
                      href="#"
                      className="v3b-link"
                      data-tip={!open ? item.label : undefined}
                      style={{
                        ...s.navItem,
                        padding: open ? "7px 10px" : "7px 0",
                        justifyContent: open ? "flex-start" : "center",
                      }}
                    >
                      {isActive && open && <img src="/assets/vip/backs_31.png" alt="" style={s.activeArrow} />}
                      <span
                        style={{
                          ...s.navIcon,
                          color: isActive ? "#e4c778" : "#5c5040",
                          position: "relative" as const,
                          zIndex: 1,
                        }}
                      >
                        {item.vipIcon ? (
                          <img
                            src={item.vipIcon}
                            alt=""
                            style={{ width: 16, height: 16, objectFit: "contain" as const }}
                          />
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={item.icon} />
                          </svg>
                        )}
                      </span>
                      {open && (
                        <span
                          style={{
                            ...s.navLabel,
                            color: isActive ? "#e4c778" : "#9a8b6f",
                            position: "relative" as const,
                            zIndex: 1,
                          }}
                        >
                          {item.label}
                        </span>
                      )}
                      {item.badge !== undefined && (
                        <span
                          style={{
                            ...s.badge,
                            position: open ? ("relative" as const) : ("absolute" as const),
                            ...(open
                              ? { marginLeft: "auto" }
                              : { top: 1, right: 3, minWidth: 14, height: 14, fontSize: "0.5rem" }),
                            zIndex: 1,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div style={s.sbBot}>
          <img
            src="/assets/vip/components_decor_7.png"
            alt=""
            style={{ width: open ? "85%" : 36, height: "auto", opacity: 0.35, margin: "0 auto 4px", display: "block" }}
          />
          <button
            onClick={() => setOpen(!open)}
            style={{ ...s.togBtn, justifyContent: open ? "flex-start" : "center" }}
            className="v3b-toggle"
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
            {open && <span style={{ fontSize: "0.7rem" }}>Collapse</span>}
          </button>
          <div style={{ ...s.userRow, justifyContent: open ? "flex-start" : "center" }}>
            <div style={s.avatar}>DK</div>
            {open && (
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f2e6c9" }}>DragonKnight99</div>
                <div style={{ fontSize: "0.62rem", color: "#7a6e5a" }}>Officer</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* === ENRICHED CONTENT === */}
      <div className="v3b-main" style={{ ...s.main, marginLeft: w }}>
        {/* Top bar with breadcrumb */}
        <header style={s.topBar}>
          <img src="/assets/vip/header_3.png" alt="" style={s.topBarBg} />
          <div style={s.topBarInner}>
            <div>
              <div style={{ fontSize: "0.68rem", color: "#7a6e5a", marginBottom: 2 }}>
                The Chillers &bull; Alpha Division
              </div>
              <h1 style={s.topH}>Community Hub</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative" as const, cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4c778" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <span style={s.notifDot}>3</span>
              </div>
              <button style={s.leatherBtn}>
                <img
                  src="/assets/vip/backs_1.png"
                  alt=""
                  style={{
                    position: "absolute" as const,
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "fill" as const,
                    borderRadius: 6,
                  }}
                />
                <span style={{ position: "relative" as const, zIndex: 1 }}>New Post</span>
              </button>
            </div>
          </div>
        </header>

        {/* Quick Actions bar */}
        <div style={{ padding: "14px 24px 0", display: "flex", gap: 10 }}>
          {[
            { label: "Upload CSV", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" },
            { label: "Review Rules", icon: "M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" },
            {
              label: "Event Calendar",
              icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
            },
          ].map((action, i) => (
            <button key={i} className="v3b-action" style={s.actionBtn}>
              <img
                src="/assets/vip/backs_1.png"
                alt=""
                style={{
                  position: "absolute" as const,
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill" as const,
                  borderRadius: 8,
                }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e4c778"
                strokeWidth="2"
                style={{ position: "relative" as const, zIndex: 1 }}
              >
                <path d={action.icon} />
              </svg>
              <span style={{ position: "relative" as const, zIndex: 1 }}>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Hero */}
        <div style={s.hero}>
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
          <img
            src="/assets/vip/decor_light_1.png"
            alt=""
            style={{
              position: "absolute" as const,
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "60%",
              opacity: 0.15,
              zIndex: 1,
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
            <img src="/assets/vip/components_decor_6.png" alt="" style={{ width: 160, opacity: 0.5 }} />
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
              src="/assets/vip/components_decor_6.png"
              alt=""
              style={{ width: 160, opacity: 0.5, transform: "scaleY(-1)" }}
            />
          </div>
        </div>

        <div style={s.grid}>
          {/* Announcements with timestamps */}
          <section style={{ ...s.card, gridColumn: "span 2" }}>
            <div style={s.tooltipHead}>
              <img
                src="/assets/vip/back_tooltip_2.png"
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
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                }}
              >
                <img src="/assets/vip/batler_icons_stat_damage.png" alt="" style={{ width: 18, height: 18 }} />
                <h3 style={s.cardTitle}>Announcements</h3>
                <span style={s.pinBadge}>Pinned</span>
              </div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {[
                {
                  text: "War prep tonight at 21:00 — full attendance required",
                  tag: "Priority",
                  color: "#c94a3a",
                  time: "30 min ago",
                  author: "CommanderX",
                },
                {
                  text: "Chest upload deadline this Friday",
                  tag: "Info",
                  color: "#4a6ea0",
                  time: "2h ago",
                  author: "Admin",
                },
                {
                  text: "Alliance tournament registrations open",
                  tag: "New",
                  color: "#4a9960",
                  time: "5h ago",
                  author: "EventBot",
                },
              ].map((item, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div
                      style={{
                        height: 1,
                        background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.2), transparent)",
                      }}
                    />
                  )}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0" }}>
                    <img
                      src="/assets/vip/batler_icons_star_4.png"
                      alt=""
                      style={{ width: 14, height: 14, marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.88rem" }}>{item.text}</div>
                      <div style={{ fontSize: "0.68rem", color: "#5c5040", marginTop: 3 }}>
                        by {item.author} &bull; {item.time}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 14,
                        background: `linear-gradient(180deg, ${item.color}, ${item.color}cc)`,
                        color: "#fff",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats with trend arrows */}
          <section style={{ ...s.card, gridColumn: "span 2" }}>
            <div style={s.tooltipHead}>
              <img
                src="/assets/vip/back_tooltip_2.png"
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
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                }}
              >
                <img src="/assets/vip/batler_icons_stat_armor.png" alt="" style={{ width: 18, height: 18 }} />
                <h3 style={s.cardTitle}>Quick Stats</h3>
                <span style={{ fontSize: "0.6rem", color: "#5c5040", marginLeft: "auto" }}>Last 7 days</span>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 1,
                background: "rgba(201,163,74,0.12)",
              }}
            >
              {[
                {
                  v: "12,450",
                  l: "Personal Score",
                  ico: "/assets/vip/batler_icons_stat_damage.png",
                  trend: "+8%",
                  up: true,
                },
                {
                  v: "210,980",
                  l: "Clan Score",
                  ico: "/assets/vip/batler_icons_stat_armor.png",
                  trend: "+3%",
                  up: true,
                },
                { v: "78/90", l: "Chest Submissions", ico: "/assets/vip/icons_chest_2.png", trend: "87%", up: true },
                {
                  v: "86%",
                  l: "Event Readiness",
                  ico: "/assets/vip/batler_icons_stat_heal.png",
                  trend: "-2%",
                  up: false,
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{ background: "rgba(10,21,32,0.8)", padding: "14px 10px", textAlign: "center" as const }}
                >
                  <img
                    src={stat.ico}
                    alt=""
                    style={{
                      width: 20,
                      height: 20,
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
                    style={{
                      fontSize: "0.6rem",
                      color: stat.up ? "#4a9960" : "#c94a3a",
                      fontWeight: 600,
                      marginTop: 2,
                    }}
                  >
                    {stat.up ? "▲" : "▼"} {stat.trend}
                  </div>
                  <div
                    style={{ fontSize: "0.6rem", color: "#9a8b6f", marginTop: 1, textTransform: "uppercase" as const }}
                  >
                    {stat.l}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* News with richer items */}
          <section style={s.card}>
            <div
              style={{
                padding: "11px 16px",
                borderBottom: "1px solid rgba(45,80,115,0.4)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={s.cardTitle}>News Feed</h3>
              <span style={{ fontSize: "0.6rem", color: "#5c5040" }}>3 unread</span>
            </div>
            {[
              { title: "Recruitment opens this week", time: "2h ago", unread: true },
              { title: "Alliance update posted", time: "5h ago", unread: true },
              { title: "War highlights published", time: "1d ago", unread: false },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(45,80,115,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {item.unread && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a34a", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: item.unread ? 600 : 400 }}>{item.title}</div>
                  <div style={{ fontSize: "0.65rem", color: "#5c5040" }}>{item.time}</div>
                </div>
              </div>
            ))}
          </section>

          {/* Events with countdown badges */}
          <section style={s.card}>
            <img
              src="/assets/banners/banner_ragnarok_clan_event_708x123.png"
              alt=""
              style={{ width: "100%", height: 56, objectFit: "cover" as const, opacity: 0.7 }}
            />
            <div style={{ padding: "10px 16px" }}>
              <h3 style={{ ...s.cardTitle, marginBottom: 8 }}>Events</h3>
              {[
                { n: "War Prep", d: "Today 20:30", c: "#c94a3a", countdown: "in 2h" },
                { n: "Guild Meeting", d: "Feb 5, 19:00", c: "#4a6ea0", countdown: "Tomorrow" },
                { n: "Training Night", d: "Feb 18, 21:00", c: "#4a9960", countdown: "12 days" },
              ].map((e, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: "0.85rem" }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.c }} />
                  <span style={{ flex: 1 }}>{e.n}</span>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: `${e.c}22`,
                      border: `1px solid ${e.c}44`,
                      color: e.c,
                      fontWeight: 600,
                    }}
                  >
                    {e.countdown}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Progress */}
          <section style={{ ...s.card, gridColumn: "span 2" }}>
            <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(45,80,115,0.4)" }}>
              <h3 style={s.cardTitle}>Clan Progress</h3>
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
                    <span>{bar.label}</span>
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

        <footer style={{ padding: "24px 24px 32px", textAlign: "center" as const }}>
          <img
            src="/assets/vip/components_decor_5.png"
            alt=""
            style={{ width: 140, opacity: 0.2, margin: "0 auto 10px", display: "block" }}
          />
          <span style={{ color: "#5c5040", fontSize: "0.78rem" }}>
            The Chillers &bull; Community Hub &bull; Total Battle Clan Platform
          </span>
          <div style={{ fontSize: "0.65rem", color: "#3a3020", marginTop: 4 }}>Built with care for the community</div>
        </footer>
      </div>

      <a href="/redesign" style={s.back}>
        &larr; Back to versions
      </a>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
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
    boxShadow: "3px 0 24px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column" as const,
    zIndex: 100,
    overflow: "hidden",
  },
  sbTexture: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.3,
    pointerEvents: "none" as const,
  },
  sbHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderBottom: "1px solid rgba(201,163,74,0.2)",
    flexShrink: 0,
    position: "relative" as const,
    zIndex: 1,
  },
  sbTitle: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#e4c778",
    whiteSpace: "nowrap" as const,
  },
  nav: { flex: 1, overflowY: "auto" as const, padding: "4px 6px", position: "relative" as const, zIndex: 1 },
  groupLabel: {
    fontSize: "0.58rem",
    fontWeight: 700,
    color: "#5c5040",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    padding: "6px 10px 2px",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "#9a8b6f",
    borderRadius: 4,
    fontSize: "0.82rem",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    position: "relative" as const,
  },
  activeArrow: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    objectFit: "fill" as const,
    opacity: 0.5,
    borderRadius: 4,
  },
  navIcon: { width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
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
  sbBot: {
    flexShrink: 0,
    padding: "6px 6px 10px",
    borderTop: "1px solid rgba(201,163,74,0.12)",
    position: "relative" as const,
    zIndex: 1,
  },
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
    transition: "all 0.12s",
    marginBottom: 4,
  },
  userRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 6px", borderRadius: 6, overflow: "hidden" },
  avatar: {
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
  topBar: { position: "relative" as const, overflow: "hidden" },
  topBarBg: {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity: 0.7,
  },
  topBarInner: {
    position: "relative" as const,
    zIndex: 1,
    padding: "14px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topH: {
    fontFamily: "'Fontin Sans', serif",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#e4c778",
    margin: 0,
    textShadow: "0 1px 8px rgba(0,0,0,0.5)",
  },
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
  leatherBtn: {
    position: "relative" as const,
    padding: "7px 14px",
    borderRadius: 6,
    border: "1px solid rgba(201,163,74,0.5)",
    background: "transparent",
    color: "#e4c778",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    overflow: "hidden",
  },
  actionBtn: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid rgba(201,163,74,0.3)",
    background: "transparent",
    color: "#e4c778",
    fontSize: "0.78rem",
    fontWeight: 600,
    cursor: "pointer",
    overflow: "hidden",
  },
  hero: {
    position: "relative" as const,
    height: 120,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  grid: { padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card: {
    background: "linear-gradient(180deg, rgba(22,44,66,0.9), rgba(14,30,45,0.92))",
    border: "1px solid rgba(45,80,115,0.5)",
    borderRadius: 10,
    overflow: "hidden",
  },
  tooltipHead: { position: "relative" as const, overflow: "hidden" },
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

export default RedesignV3BPage;
