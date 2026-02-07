"use client";

import { useState } from "react";
import AuthActions from "./components/auth-actions";
import ClanScopeBanner from "./components/clan-scope-banner";
import QuickActions from "./components/quick-actions";
import SectionHero from "./components/section-hero";

/**
 * Dashboard page — Sanctum Complete design with enriched content.
 */
function DashboardPage(): JSX.Element {
  const [newsTab, setNewsTab] = useState<string>("all");

  return (
    <>
      {/* Ornate top bar */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">
              The Chillers &bull; Alpha Division
            </div>
            <h1 className="top-bar-title">Community Dashboard</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>

      <QuickActions />

      <SectionHero
        title="Community Hub"
        subtitle="Coordinated. Competitive. Welcoming."
        bannerSrc="/assets/banners/banner_gold_dragon.png"
      />

      <div className="content-inner">
        <ClanScopeBanner />

        <div className="grid">
          {/* Announcements */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="tooltip-head">
              <img
                src="/assets/vip/back_tooltip_2.png"
                alt=""
                className="tooltip-head-bg"
                width={400}
                height={44}
                loading="lazy"
              />
              <div className="tooltip-head-inner">
                <img
                  src="/assets/vip/batler_icons_stat_damage.png"
                  alt="Announcements"
                  width={18}
                  height={18}
                  loading="lazy"
                />
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 0",
                    }}
                  >
                    <img
                      src="/assets/vip/batler_icons_star_4.png"
                      alt=""
                      width={14}
                      height={14}
                      style={{ marginTop: 2 }}
                      loading="lazy"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.88rem" }}>{item.text}</div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--color-text-muted)",
                          marginTop: 3,
                        }}
                      >
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
              <img
                src="/assets/vip/back_tooltip_2.png"
                alt=""
                className="tooltip-head-bg"
                width={400}
                height={44}
                loading="lazy"
              />
              <div className="tooltip-head-inner">
                <img
                  src="/assets/vip/batler_icons_stat_armor.png"
                  alt="Stats"
                  width={18}
                  height={18}
                  loading="lazy"
                />
                <h3 className="card-title">Quick Stats</h3>
                <span
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--color-text-muted)",
                    marginLeft: "auto",
                  }}
                >
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
                {
                  v: "78/90",
                  l: "Chests",
                  ico: "/assets/vip/icons_chest_2.png",
                  trend: "87%",
                  up: true,
                },
                {
                  v: "86%",
                  l: "Readiness",
                  ico: "/assets/vip/batler_icons_stat_heal.png",
                  trend: "-2%",
                  up: false,
                },
              ].map((stat, i) => (
                <div key={i} className="stat-cell">
                  <img
                    src={stat.ico}
                    alt={stat.l}
                    width={20}
                    height={20}
                    loading="lazy"
                    style={{
                      margin: "0 auto 4px",
                      display: "block",
                      objectFit: "contain",
                    }}
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
              {
                title: "Recruitment opens this week",
                time: "2h ago",
                unread: true,
              },
              {
                title: "Alliance update posted",
                time: "5h ago",
                unread: true,
              },
              {
                title: "War highlights published",
                time: "1d ago",
                unread: false,
              },
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
                  <div
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: item.unread ? 600 : 400,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {item.time}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Events */}
          <section className="card">
            <img
              src="/assets/banners/banner_ragnarok_clan_event_708x123.png"
              alt="Upcoming clan events banner"
              width={708}
              height={123}
              loading="lazy"
              style={{
                width: "100%",
                height: 56,
                objectFit: "cover",
                opacity: 0.7,
              }}
            />
            <div style={{ padding: "10px 16px" }}>
              <h3 className="card-title" style={{ marginBottom: 8 }}>
                Events
              </h3>
              {[
                {
                  n: "War Prep",
                  c: "#c94a3a",
                  countdown: "in 2h",
                },
                {
                  n: "Guild Meeting",
                  c: "#4a6ea0",
                  countdown: "Tomorrow",
                },
                {
                  n: "Training Night",
                  c: "#4a9960",
                  countdown: "12 days",
                },
              ].map((e, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: e.c,
                    }}
                  />
                  <span style={{ flex: 1 }}>{e.n}</span>
                  <span
                    className="countdown-badge"
                    style={{
                      background: `${e.c}22`,
                      border: `1px solid ${e.c}44`,
                      color: e.c,
                    }}
                  >
                    {e.countdown}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Progress */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Clan Progress</h3>
            </div>
            <div
              style={{
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {[
                {
                  label: "Weekly Chest Target",
                  value: 87,
                  color: "#c9a34a",
                },
                {
                  label: "Event Participation",
                  value: 72,
                  color: "#4a9960",
                },
                {
                  label: "Member Activity",
                  value: 94,
                  color: "#4a6ea0",
                },
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
                    <span style={{ color: bar.color, fontWeight: 700 }}>
                      {bar.value}%
                    </span>
                  </div>
                  <div className="game-progress">
                    <img
                      src="/assets/vip/battler_stage_bar_empty.png"
                      alt=""
                      className="game-progress-bg"
                      width={400}
                      height={20}
                      loading="lazy"
                    />
                    <div
                      className="game-progress-fill"
                      style={{ width: `${bar.value}%` }}
                    >
                      <img
                        src="/assets/vip/battler_stage_bar_full.png"
                        alt=""
                        className="game-progress-bg"
                        width={400}
                        height={20}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;
