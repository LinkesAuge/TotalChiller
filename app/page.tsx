"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../lib/supabase/browser-client";
import useClanContext from "./components/use-clan-context";
import AuthActions from "./components/auth-actions";
import SectionHero from "./components/section-hero";

/* ── Types ── */

interface ArticleRow {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: readonly string[];
  readonly created_at: string;
  readonly author_name: string | null;
}

interface EventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly author_name: string | null;
}

/* ── Helpers ── */

const EVENT_COLORS: readonly string[] = ["#c94a3a", "#4a6ea0", "#4a9960", "#c9a34a", "#8a6ea0"];

/**
 * Returns a human-readable countdown string for an event start time.
 */
function formatCountdown(startsAt: string, tDashboard: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const start = new Date(startsAt);
  const diffMs = start.getTime() - now.getTime();
  if (diffMs < 0) {
    return tDashboard("today");
  }
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays === 1) {
    return tDashboard("tomorrow");
  }
  return tDashboard("inDays", { count: diffDays });
}

/**
 * Returns a relative time string (e.g. "2h ago").
 */
function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

/**
 * Dashboard page — Sanctum Complete design with real clan data.
 */
function DashboardPage(): JSX.Element {
  const t = useTranslations("dashboard");
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();

  /* ── Announcements state ── */
  const [announcements, setAnnouncements] = useState<readonly ArticleRow[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState<boolean>(true);

  /* ── Events state ── */
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);

  /** Resolve user IDs to display names via profiles table. */
  async function resolveAuthorNames(userIds: readonly string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)].filter(Boolean);
    const map = new Map<string, string>();
    if (unique.length === 0) return map;
    const { data } = await supabase.from("profiles").select("id,display_name,username").in("id", unique);
    for (const p of (data ?? []) as Array<{ id: string; display_name: string | null; username: string | null }>) {
      const name = p.display_name || p.username || "";
      if (name) map.set(p.id, name);
    }
    return map;
  }

  /* ── Load announcements ── */
  useEffect(() => {
    async function loadAnnouncements(): Promise<void> {
      if (!clanContext?.clanId) {
        setAnnouncements([]);
        setIsLoadingAnnouncements(false);
        return;
      }
      setIsLoadingAnnouncements(true);
      const { data, error } = await supabase
        .from("articles")
        .select("id,title,content,type,is_pinned,status,tags,created_at,created_by")
        .eq("clan_id", clanContext.clanId)
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      setIsLoadingAnnouncements(false);
      if (error) {
        return;
      }
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const authorMap = await resolveAuthorNames(rows.map((r) => String(r.created_by ?? "")));
      setAnnouncements(
        rows.map((row) => ({
          ...row,
          author_name: authorMap.get(String(row.created_by ?? "")) ?? null,
        })) as ArticleRow[],
      );
    }
    void loadAnnouncements();
  }, [clanContext?.clanId, supabase]);

  /* ── Load events ── */
  useEffect(() => {
    async function loadEvents(): Promise<void> {
      if (!clanContext?.clanId) {
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }
      setIsLoadingEvents(true);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,location,starts_at,ends_at,created_by")
        .eq("clan_id", clanContext.clanId)
        .gte("ends_at", now)
        .is("recurrence_parent_id", null)
        .order("starts_at", { ascending: true })
        .limit(5);
      setIsLoadingEvents(false);
      if (error) {
        return;
      }
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const authorMap = await resolveAuthorNames(rows.map((r) => String(r.created_by ?? "")));
      setEvents(
        rows.map((row) => ({
          ...row,
          author_name: authorMap.get(String(row.created_by ?? "")) ?? null,
        })) as EventRow[],
      );
    }
    void loadEvents();
  }, [clanContext?.clanId, supabase]);

  /* ── Tag color helper ── */
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const colors: Record<string, string> = {
      Priority: "#c94a3a",
      Priorität: "#c94a3a",
      Info: "#4a6ea0",
      New: "#4a9960",
      Neu: "#4a9960",
      Update: "#c9a34a",
    };
    announcements.forEach((a) => {
      a.tags.forEach((tag) => {
        if (!map.has(tag)) {
          map.set(tag, colors[tag] ?? "#4a6ea0");
        }
      });
    });
    return map;
  }, [announcements]);

  return (
    <>
      {/* Ornate top bar */}
      <div className="top-bar">
        <Image
          src="/assets/vip/header_3.png"
          alt=""
          role="presentation"
          className="top-bar-bg"
          width={1200}
          height={56}
          priority
        />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>

      <SectionHero
        title="Community Hub"
        subtitle="Coordinated. Competitive. Welcoming."
        bannerSrc="/assets/banners/banner_gold_dragon.png"
      />

      <div className="content-inner">
        <div className="grid">
          {/* ── Announcements (real data) ── */}
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
                <h3 className="card-title">{t("announcementsTitle")}</h3>
                <Link
                  href="/news"
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.65rem",
                    color: "var(--color-gold)",
                    textDecoration: "none",
                  }}
                >
                  {t("viewAll")} →
                </Link>
              </div>
            </div>
            <div className="card-body">
              {isLoadingAnnouncements && (
                <div style={{ padding: "16px 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Loading…</div>
              )}
              {!isLoadingAnnouncements && announcements.length === 0 && (
                <div style={{ padding: "16px 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  {t("noAnnouncements")}
                </div>
              )}
              {!isLoadingAnnouncements &&
                announcements.map((article, i) => {
                  const firstTag = article.tags.length > 0 ? article.tags[0] : null;
                  const tagColor = firstTag ? (tagColorMap.get(firstTag) ?? "#4a6ea0") : "#4a6ea0";
                  return (
                    <div key={article.id}>
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
                          src={
                            article.is_pinned
                              ? "/assets/vip/batler_icons_star_5.png"
                              : "/assets/vip/batler_icons_star_4.png"
                          }
                          alt={article.is_pinned ? t("pinnedLabel") : ""}
                          width={14}
                          height={14}
                          style={{ marginTop: 2 }}
                          loading="lazy"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.88rem" }}>{article.title}</div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--color-text-muted)",
                              marginTop: 3,
                            }}
                          >
                            {formatRelativeTime(article.created_at)}
                            {article.type === "announcement" ? " • " + article.type : ""}
                            {article.author_name && ` • ${article.author_name}`}
                          </div>
                        </div>
                        {firstTag && (
                          <span
                            className="badge"
                            style={{
                              padding: "2px 8px",
                              flexShrink: 0,
                              background: `linear-gradient(180deg, ${tagColor}, ${tagColor}cc)`,
                              borderColor: tagColor,
                              color: "#fff",
                            }}
                          >
                            {firstTag}
                          </span>
                        )}
                        {article.is_pinned && !firstTag && <span className="pin-badge">{t("pinnedLabel")}</span>}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* ── Stats (placeholder — retained from original design) ── */}
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
                <img src="/assets/vip/batler_icons_stat_armor.png" alt="Stats" width={18} height={18} loading="lazy" />
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
                  v: "—",
                  l: "Personal Score",
                  ico: "/assets/vip/batler_icons_stat_damage.png",
                  trend: "—",
                  up: true,
                },
                {
                  v: "—",
                  l: "Clan Score",
                  ico: "/assets/vip/batler_icons_stat_armor.png",
                  trend: "—",
                  up: true,
                },
                {
                  v: "—",
                  l: "Chests",
                  ico: "/assets/vip/icons_chest_2.png",
                  trend: "—",
                  up: true,
                },
                {
                  v: "—",
                  l: "Readiness",
                  ico: "/assets/vip/batler_icons_stat_heal.png",
                  trend: "—",
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
                  <div className="stat-label">{stat.l}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Events (real data) ── */}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  {t("eventsTitle")}
                </h3>
                <Link
                  href="/events"
                  style={{ fontSize: "0.65rem", color: "var(--color-gold)", textDecoration: "none" }}
                >
                  {t("viewAll")} →
                </Link>
              </div>
              {isLoadingEvents && (
                <div style={{ padding: "8px 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Loading…</div>
              )}
              {!isLoadingEvents && events.length === 0 && (
                <div style={{ padding: "8px 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  {t("noEventsScheduled")}
                </div>
              )}
              {!isLoadingEvents &&
                events.map((event, i) => {
                  const color = EVENT_COLORS[i % EVENT_COLORS.length];
                  return (
                    <div
                      key={event.id}
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
                          background: color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.title}
                        {event.author_name && (
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginLeft: 4 }}>
                            {event.author_name}
                          </span>
                        )}
                      </span>
                      <span
                        className="countdown-badge"
                        style={{
                          background: `${color}22`,
                          border: `1px solid ${color}44`,
                          color,
                          flexShrink: 0,
                        }}
                      >
                        {formatCountdown(event.starts_at, t)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* ── Clan Progress (placeholder — retained) ── */}
          <section className="card">
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
                  value: 0,
                  color: "#c9a34a",
                },
                {
                  label: "Event Participation",
                  value: 0,
                  color: "#4a9960",
                },
                {
                  label: "Member Activity",
                  value: 0,
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
                    <span style={{ color: bar.color, fontWeight: 700 }}>{bar.value}%</span>
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
                    <div className="game-progress-fill" style={{ width: `${bar.value}%` }}>
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
