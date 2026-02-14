"use client";

import { useState } from "react";
import Image from "next/image";
import SectionHero from "../../components/section-hero";

/**
 * Comprehensive Sanctum UI/UX preview — demonstrates every UI pattern.
 * Uses the new CSS classes from globals.css (not inline styles).
 *
 * Sections:
 * 1. Top Bar + Hero Banner
 * 2. Quick Actions
 * 3. Dashboard Cards (announcements, stats, news, events, progress)
 * 4. Table View (data import / chest database)
 * 5. Form View (settings cards, auth form)
 * 6. Messages View (two-column layout)
 * 7. Admin Tabs
 * 8. Modal + Alerts
 */

function PreviewPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>("clans");
  const [newsTab, setNewsTab] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);

  return (
    <div>
      {/* ─── TOP BAR ─── */}
      <div className="top-bar">
        <Image src="/assets/vip/header_3.png" alt="" width={1920} height={60} className="top-bar-bg" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">The Chillers &bull; Alpha Division</div>
            <h1 className="top-bar-title">Sanctum Design Preview</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="button leather">
              <Image src="/assets/vip/backs_1.png" alt="" width={200} height={40} className="leather-bg" />
              <span>New Post</span>
            </button>
          </div>
        </div>
      </div>

      <SectionHero
        title="Community Hub"
        subtitle="Coordinated. Competitive. Welcoming."
        bannerSrc="/assets/banners/banner_gold_dragon.png"
      />

      <div className="content-inner">
        {/* ═══ SECTION: Dashboard Cards ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "0 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Dashboard Cards
        </h2>

        <div className="grid">
          {/* Announcements */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="tooltip-head">
              <Image src="/assets/vip/back_tooltip_2.png" alt="" width={400} height={40} className="tooltip-head-bg" />
              <div className="tooltip-head-inner">
                <Image src="/assets/vip/batler_icons_stat_damage.png" alt="" width={18} height={18} />
                <h3 className="card-title">Announcements</h3>
                <span className="pin-badge">Pinned</span>
              </div>
            </div>
            <div className="card-body">
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
                  {i > 0 && <div className="gold-divider" />}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0" }}>
                    <Image
                      src="/assets/vip/batler_icons_star_4.png"
                      alt=""
                      width={14}
                      height={14}
                      style={{ marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.88rem" }}>{item.text}</div>
                      <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: 3 }}>
                        by {item.author} &bull; {item.time}
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        padding: "2px 8px",
                        background: `linear-gradient(180deg, ${item.color}, ${item.color}cc)`,
                        borderColor: item.color,
                        color: "#fff",
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="tooltip-head">
              <Image src="/assets/vip/back_tooltip_2.png" alt="" width={400} height={40} className="tooltip-head-bg" />
              <div className="tooltip-head-inner">
                <Image src="/assets/vip/batler_icons_stat_armor.png" alt="" width={18} height={18} />
                <h3 className="card-title">Quick Stats</h3>
                <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", marginLeft: "auto" }}>
                  Last 7 days
                </span>
              </div>
            </div>
            <div className="stat-grid">
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
                { v: "78/90", l: "Chests", ico: "/assets/vip/icons_chest_2.png", trend: "87%", up: true },
                { v: "86%", l: "Readiness", ico: "/assets/vip/batler_icons_stat_heal.png", trend: "-2%", up: false },
              ].map((stat, i) => (
                <div key={i} className="stat-cell">
                  <Image
                    src={stat.ico}
                    alt=""
                    width={20}
                    height={20}
                    style={{ margin: "0 auto 4px", display: "block", objectFit: "contain" }}
                  />
                  <div className="stat-value">{stat.v}</div>
                  <div className={stat.up ? "trend-up" : "trend-down"}>
                    {stat.up ? "▲" : "▼"} {stat.trend}
                  </div>
                  <div className="stat-label">{stat.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* News */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">News Feed</h3>
              <div className="tab-group">
                {["all", "clan", "global"].map((tab) => (
                  <button
                    key={tab}
                    className={`tab-group-btn${newsTab === tab ? " active" : ""}`}
                    onClick={() => setNewsTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
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
                {item.unread && <span className="unread-dot" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: item.unread ? 600 : 400 }}>{item.title}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>{item.time}</div>
                </div>
              </div>
            ))}
          </section>

          {/* Events */}
          <section className="card">
            <Image
              src="/assets/banners/banner_ragnarok_clan_event_708x123.png"
              alt=""
              width={708}
              height={56}
              style={{ width: "100%", height: 56, objectFit: "cover", opacity: 0.7 }}
            />
            <div style={{ padding: "10px 16px" }}>
              <h3 className="card-title" style={{ marginBottom: 8 }}>
                Events
              </h3>
              {[
                { n: "War Prep", c: "#c94a3a", countdown: "in 2h" },
                { n: "Guild Meeting", c: "#4a6ea0", countdown: "Tomorrow" },
                { n: "Training Night", c: "#4a9960", countdown: "12 days" },
              ].map((e, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: "0.85rem" }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.c }} />
                  <span style={{ flex: 1 }}>{e.n}</span>
                  <span
                    className="countdown-badge"
                    style={{ background: `${e.c}22`, border: `1px solid ${e.c}44`, color: e.c }}
                  >
                    {e.countdown}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Progress bars */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Clan Progress</h3>
            </div>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
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
                      color: "var(--color-text-2)",
                      marginBottom: 5,
                    }}
                  >
                    <span>{bar.label}</span>
                    <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}%</span>
                  </div>
                  <div className="game-progress">
                    <Image
                      src="/assets/vip/battler_stage_bar_empty.png"
                      alt=""
                      width={400}
                      height={20}
                      className="game-progress-bg"
                    />
                    <div className="game-progress-fill" style={{ width: `${bar.value}%` }}>
                      <Image
                        src="/assets/vip/battler_stage_bar_full.png"
                        alt=""
                        width={400}
                        height={20}
                        className="game-progress-bg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ SECTION: Table View ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "32px 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Table View
        </h2>

        <div className="grid">
          <div style={{ gridColumn: "1 / -1" }}>
            {/* Filter bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input placeholder="Search player..." style={{ padding: "8px 12px", fontSize: "0.85rem", width: 200 }} />
              <select style={{ padding: "8px 12px", fontSize: "0.85rem" }}>
                <option>All Sources</option>
                <option>Battle</option>
                <option>Quest</option>
              </select>
              <button className="button">Filter</button>
              <button className="button primary">Import CSV</button>
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--color-text-2)" }}>
                Showing 5 of 128 entries
              </span>
            </div>

            {/* Table */}
            <div className="table">
              <header style={{ gridTemplateColumns: "60px 110px 1fr 1fr 100px 100px" }}>
                <span>#</span>
                <span>Date</span>
                <span>Player</span>
                <span>Source</span>
                <span>Chest</span>
                <span>Score</span>
              </header>
              {[
                {
                  id: 1,
                  date: "05.02.2026",
                  player: "DragonKnight99",
                  source: "Battle",
                  chest: "Warrior",
                  score: "2,450",
                  valid: true,
                },
                {
                  id: 2,
                  date: "05.02.2026",
                  player: "ShadowArcher",
                  source: "Quest",
                  chest: "Mage",
                  score: "1,820",
                  valid: true,
                },
                {
                  id: 3,
                  date: "04.02.2026",
                  player: "IronFist",
                  source: "Battle",
                  chest: "Knight",
                  score: "3,100",
                  valid: false,
                },
                {
                  id: 4,
                  date: "04.02.2026",
                  player: "StormMage",
                  source: "Raid",
                  chest: "Epic",
                  score: "5,200",
                  valid: true,
                },
                {
                  id: 5,
                  date: "03.02.2026",
                  player: "GoldHunter",
                  source: "Battle",
                  chest: "Warrior",
                  score: "1,950",
                  valid: true,
                },
              ].map((row) => (
                <div
                  key={row.id}
                  className={`row${!row.valid ? " validation-invalid" : ""}`}
                  style={{ gridTemplateColumns: "60px 110px 1fr 1fr 100px 100px" }}
                >
                  <span>{row.id}</span>
                  <span>{row.date}</span>
                  <span>{row.player}</span>
                  <span>{row.source}</span>
                  <span>{row.chest}</span>
                  <strong style={{ color: "var(--color-gold-2)" }}>{row.score}</strong>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination-bar" style={{ marginTop: 12 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>Page 1 of 26</span>
              <div className="pagination-actions">
                <button className="button" style={{ padding: "6px 10px", fontSize: "0.8rem" }}>
                  &larr; Prev
                </button>
                <button className="button" style={{ padding: "6px 10px", fontSize: "0.8rem" }}>
                  Next &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SECTION: Form View ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "32px 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Form View
        </h2>

        <div className="grid">
          {/* Settings form card */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">Account Settings</h3>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="preview-email">Email Address</label>
                <input id="preview-email" type="email" placeholder="knight@totalchiller.com" />
              </div>
              <div className="form-group">
                <label htmlFor="preview-display-name">Display Name</label>
                <input id="preview-display-name" type="text" placeholder="DragonKnight99" />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button className="button primary">Save Changes</button>
                <button className="button">Cancel</button>
              </div>
            </div>
          </section>

          {/* Auth form card */}
          <section className="card">
            <div className="tooltip-head">
              <Image src="/assets/vip/back_tooltip_2.png" alt="" width={400} height={40} className="tooltip-head-bg" />
              <div className="tooltip-head-inner">
                <Image src="/assets/vip/batler_icons_star_4.png" alt="" width={18} height={18} />
                <h3 className="card-title">Sign In</h3>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="preview-username">Username or Email</label>
                <input id="preview-username" type="text" placeholder="Enter your username" />
              </div>
              <div className="form-group">
                <label htmlFor="preview-password">Password</label>
                <input id="preview-password" type="password" placeholder="Enter your password" />
              </div>
              <button className="button leather" style={{ width: "100%", marginTop: 8 }}>
                <Image src="/assets/vip/backs_1.png" alt="" width={200} height={40} className="leather-bg" />
                <span>Enter the Sanctum</span>
              </button>
              <div style={{ textAlign: "center", marginTop: 10, fontSize: "0.8rem", color: "var(--color-text-2)" }}>
                New here?{" "}
                <a href="#" style={{ color: "var(--color-gold)" }}>
                  Create an account
                </a>
              </div>
            </div>
          </section>

          {/* Notification toggles */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Notification Preferences</h3>
            </div>
            <div className="card-body">
              {["Messages", "News Updates", "Event Reminders", "System Alerts"].map((pref, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < 3 ? "1px solid rgba(45,80,115,0.2)" : "none",
                  }}
                >
                  <span style={{ fontSize: "0.88rem" }}>{pref}</span>
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={i < 2} />
                    <span className="toggle-slider" />
                    <span className="sr-only">{pref}</span>
                  </label>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ═══ SECTION: Messages View ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "32px 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Messages View
        </h2>

        <div className="grid">
          <div className="messages-layout" style={{ gridColumn: "1 / -1" }}>
            {/* Conversation list */}
            <div className="messages-list-panel card">
              <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(45,80,115,0.4)" }}>
                <h3 className="card-title">Conversations</h3>
              </div>
              <div className="messages-conversation-list">
                {[
                  { name: "CommanderX", preview: "War prep tonight...", time: "2m", unread: true, active: true },
                  { name: "ShadowArcher", preview: "Got the chests uploaded", time: "1h", unread: true, active: false },
                  { name: "System", preview: "Your account was approved", time: "3h", unread: false, active: false },
                ].map((c, i) => (
                  <button
                    key={i}
                    className={`messages-conversation-item${c.active ? " active" : ""}${c.unread ? " unread" : ""}`}
                  >
                    <div className="messages-conversation-header">
                      <strong style={{ fontSize: "0.88rem" }}>{c.name}</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-2)" }}>{c.time}</span>
                    </div>
                    <div className="messages-conversation-preview">
                      <span style={{ color: "var(--color-text-2)", fontSize: "0.82rem" }}>{c.preview}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Thread panel */}
            <div className="messages-thread-panel card">
              <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(45,80,115,0.4)" }}>
                <h3 className="card-title">CommanderX</h3>
              </div>
              <div className="messages-thread-list">
                <div className="messages-bubble">
                  <div className="messages-bubble-content">
                    War prep tonight at 21:00. Make sure everyone is online.
                  </div>
                  <div className="messages-bubble-meta">
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-2)" }}>CommanderX &bull; 2m ago</span>
                  </div>
                </div>
                <div className="messages-bubble self">
                  <div className="messages-bubble-content">Roger that, I&#39;ll ping the guild.</div>
                  <div className="messages-bubble-meta">
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-2)" }}>You &bull; just now</span>
                  </div>
                </div>
              </div>
              <div className="messages-reply-bar">
                <input className="messages-reply-input" placeholder="Type a message..." />
                <button className="button primary" style={{ padding: "8px 14px" }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SECTION: Admin Tabs ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "32px 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Admin Tabs
        </h2>

        <div className="grid">
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(45,80,115,0.4)" }}>
              <div className="tabs">
                {["clans", "approvals", "users", "validation", "corrections", "logs"].map((tab) => (
                  <button
                    key={tab}
                    className={`tab${activeTab === tab ? " active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                    style={{ textTransform: "capitalize" }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="card-body">
              <p style={{ color: "var(--color-text-2)", marginBottom: 12 }}>
                Active tab:{" "}
                <strong style={{ color: "var(--color-gold-2)", textTransform: "capitalize" }}>{activeTab}</strong>
              </p>
              <div className="table">
                <header style={{ gridTemplateColumns: "60px 1fr 120px 120px" }}>
                  <span>#</span>
                  <span>Name</span>
                  <span>Role</span>
                  <span>Status</span>
                </header>
                {[
                  { id: 1, name: "The Chillers", role: "Clan", status: "Active" },
                  { id: 2, name: "Alpha Squad", role: "Division", status: "Active" },
                  { id: 3, name: "Beta Team", role: "Division", status: "Inactive" },
                ].map((row) => (
                  <div key={row.id} className="row" style={{ gridTemplateColumns: "60px 1fr 120px 120px" }}>
                    <span>{row.id}</span>
                    <span>{row.name}</span>
                    <span>{row.role}</span>
                    <span className={`status${row.status === "Inactive" ? " warn" : " success"}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ═══ SECTION: Alerts & Modal ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "32px 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Alerts &amp; Modal
        </h2>

        <div className="grid">
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Alert Variants</h3>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="alert info">ℹ️ Import completed: 45 entries processed.</div>
              <div className="alert success">✅ All chest data validated successfully.</div>
              <div className="alert warn">⚠️ 3 entries have duplicate player names.</div>
              <div className="alert error">❌ Failed to connect to database. Check your connection.</div>
              <div style={{ marginTop: 8 }}>
                <button className="button" onClick={() => setShowModal(true)}>
                  Open Modal
                </button>
              </div>
            </div>
          </section>

          {/* Badges row */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Badges &amp; Status</h3>
            </div>
            <div className="card-body" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="badge">Rank: Officer</span>
              <span className="pin-badge">Pinned</span>
              <span className="status success">Active</span>
              <span className="status warn">Pending</span>
              <span className="status error">Rejected</span>
              <span
                className="countdown-badge"
                style={{ background: "#c94a3a22", border: "1px solid #c94a3a44", color: "#c94a3a" }}
              >
                in 2h
              </span>
              <span
                className="countdown-badge"
                style={{ background: "#4a6ea022", border: "1px solid #4a6ea044", color: "#4a6ea0" }}
              >
                Tomorrow
              </span>
            </div>
          </section>
        </div>

        {/* ═══ SECTION: Charts Placeholder ═══ */}
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold-2)",
            fontSize: "1.1rem",
            margin: "32px 0 12px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Charts View
        </h2>

        <div className="grid">
          {["Clan Score Over Time", "Top Players", "Chest Type Distribution", "Personal Score"].map((title, i) => (
            <section key={i} className="card">
              <div className="tooltip-head">
                <Image
                  src="/assets/vip/back_tooltip_2.png"
                  alt=""
                  width={400}
                  height={40}
                  className="tooltip-head-bg"
                />
                <div className="tooltip-head-inner">
                  <Image src="/assets/vip/batler_icons_stat_armor.png" alt="" width={16} height={16} />
                  <h3 className="card-title">{title}</h3>
                </div>
              </div>
              <div className="chart-empty" style={{ margin: 12 }}>
                Chart Placeholder
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ═══ MODAL ═══ */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setShowModal(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowModal(false);
          }}
        >
          <div className="card modal" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <div className="tooltip-head">
              <Image src="/assets/vip/back_tooltip_2.png" alt="" width={400} height={40} className="tooltip-head-bg" />
              <div className="tooltip-head-inner">
                <h3 className="card-title">Confirm Action</h3>
              </div>
            </div>
            <div className="card-body">
              <p style={{ marginBottom: 16, color: "var(--color-text-2)" }}>
                Are you sure you want to delete these 3 entries? This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="button danger" onClick={() => setShowModal(false)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <a
        href="/redesign"
        style={{
          position: "fixed",
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
        }}
      >
        &larr; Back to versions
      </a>
    </div>
  );
}

export default PreviewPage;
