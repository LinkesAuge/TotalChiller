"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsContentManager from "../../lib/supabase/role-access";
import EditableText from "../components/editable-text";
import PublicAuthActions from "../components/public-auth-actions";
import ForumMarkdown from "../forum/forum-markdown";

/* ─── Types ─── */

interface ContentRow {
  readonly page: string;
  readonly section_key: string;
  readonly field_key: string;
  readonly content_de: string;
  readonly content_en: string;
}

type ContentMap = Record<string, Record<string, { de: string; en: string }>>;

/* ─── Component ─── */

function HomeClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const t = useTranslations("home");
  const locale = useLocale();

  const [canEdit, setCanEdit] = useState(false);
  const [content, setContent] = useState<ContentMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  /* Load CMS content */
  const loadContent = useCallback(async () => {
    try {
      const res = await fetch("/api/site-content?page=home");
      if (res.ok) {
        const rows: ContentRow[] = await res.json();
        const map: ContentMap = {};
        for (const row of rows) {
          if (!map[row.section_key]) map[row.section_key] = {};
          map[row.section_key][row.field_key] = { de: row.content_de, en: row.content_en };
        }
        setContent(map);
      }
    } catch {
      /* Fallback to translations if API fails */
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    void loadContent();
    void getIsContentManager({ supabase }).then(setCanEdit);
  }, [supabase, loadContent]);

  /** Get a CMS field value, falling back to a translation key */
  function c(section: string, field: string, fallback: string): string {
    const entry = content[section]?.[field];
    if (entry) {
      const val = locale === "en" ? entry.en : entry.de;
      if (val) return val;
    }
    return fallback;
  }

  /** Get English value for a field */
  function cEn(section: string, field: string): string {
    return content[section]?.[field]?.en ?? "";
  }

  /** Save a CMS field */
  async function saveField(section: string, field: string, valueDe: string, valueEn: string): Promise<void> {
    await fetch("/api/site-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: "home",
        section_key: section,
        field_key: field,
        content_de: valueDe,
        content_en: valueEn,
      }),
    });
    /* Update local state */
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [field]: { de: valueDe, en: valueEn },
      },
    }));
  }

  if (!isLoaded) {
    return (
      <>
        <div className="top-bar">
          <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
          <div className="top-bar-inner">
            <div><h1 className="top-bar-title">{t("title")}</h1></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><PublicAuthActions /></div>
          </div>
        </div>
        <div className="content-inner"><div className="alert info loading">Laden...</div></div>
      </>
    );
  }

  return (
    <>
      {/* ═══ Top Bar ═══ */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PublicAuthActions />
          </div>
        </div>
      </div>

      {/* ═══ Hero Banner ═══ */}
      <div className="hero-banner">
        <div className="hero-overlay" />
        <img src="/assets/banners/banner_gold_dragon.webp" alt={t("heroBannerAlt")} className="hero-bg" width={1200} height={300} loading="eager" fetchPriority="high" />
        <img src="/assets/vip/decor_light_1.png" alt="" className="hero-light" width={400} height={400} loading="eager" />
        <div className="hero-content">
          <img src="/assets/vip/components_decor_6.png" alt="" className="hero-decor" width={300} height={20} loading="lazy" />
          <h2 className="hero-title">{t("heroTitle")}</h2>
          <p className="hero-subtitle">{t("heroSubtitle")}</p>
          <img src="/assets/vip/components_decor_6.png" alt="" className="hero-decor flipped" width={300} height={20} loading="lazy" />
        </div>
      </div>

      <div className="content-inner">
        <div className="grid">

          {/* ═══ Über uns ═══ */}
          <section className="card home-about-card" style={{ gridColumn: "1 / -1" }}>
            <div className="tooltip-head">
              <img src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
              <div className="tooltip-head-inner">
                <img src="/assets/vip/batler_icons_stat_damage.png" alt="" width={18} height={18} loading="lazy" />
                <EditableText
                  as="h3"
                  className="card-title"
                  value={c("aboutUs", "title", t("missionTitle"))}
                  valueEn={cEn("aboutUs", "title")}
                  canEdit={canEdit}
                  locale={locale}
                  singleLine
                  onSave={(de, en) => saveField("aboutUs", "title", de, en)}
                />
                <span className="pin-badge">
                  <EditableText
                    value={c("aboutUs", "badge", t("missionBadge"))}
                    valueEn={cEn("aboutUs", "badge")}
                    canEdit={canEdit}
                    locale={locale}
                    singleLine
                    onSave={(de, en) => saveField("aboutUs", "badge", de, en)}
                  />
                </span>
              </div>
            </div>
            <div className="card-body home-about-body">
              {/* Intro */}
              <div className="home-about-intro">
                <EditableText
                  as="div"
                  value={c("aboutUs", "intro", t("missionText1"))}
                  valueEn={cEn("aboutUs", "intro")}
                  canEdit={canEdit}
                  locale={locale}
                  markdown
                  onSave={(de, en) => saveField("aboutUs", "intro", de, en)}
                />
              </div>

              {/* Requirements */}
              <div className="home-about-requirements">
                <h4 className="home-about-section-title">{locale === "en" ? "Requirements" : "Voraussetzungen"}</h4>
                <EditableText
                  as="div"
                  value={c("aboutUs", "requirements", "")}
                  valueEn={cEn("aboutUs", "requirements")}
                  canEdit={canEdit}
                  locale={locale}
                  markdown
                  onSave={(de, en) => saveField("aboutUs", "requirements", de, en)}
                />
              </div>

              {/* Contact / Application */}
              <div className="home-about-apply">
                <h4 className="home-about-section-title">{locale === "en" ? "Apply" : "Bewerbung"}</h4>
                <EditableText
                  as="div"
                  value={c("aboutUs", "contact", "")}
                  valueEn={cEn("aboutUs", "contact")}
                  canEdit={canEdit}
                  locale={locale}
                  markdown
                  onSave={(de, en) => saveField("aboutUs", "contact", de, en)}
                />
              </div>

              {/* Extras — diplomats, ancient */}
              <div className="home-about-extras">
                <EditableText
                  as="div"
                  value={c("aboutUs", "extras", "")}
                  valueEn={cEn("aboutUs", "extras")}
                  canEdit={canEdit}
                  locale={locale}
                  markdown
                  onSave={(de, en) => saveField("aboutUs", "extras", de, en)}
                />
              </div>

              {/* Disclaimer */}
              <div className="home-about-disclaimer">
                <EditableText
                  as="div"
                  value={c("aboutUs", "disclaimer", "")}
                  valueEn={cEn("aboutUs", "disclaimer")}
                  canEdit={canEdit}
                  locale={locale}
                  markdown
                  onSave={(de, en) => saveField("aboutUs", "disclaimer", de, en)}
                />
              </div>
            </div>
          </section>

          {/* ═══ Logo Divider ═══ */}
          <div className="home-logo-divider" style={{ gridColumn: "1 / -1" }}>
            <img src="/assets/vip/components_decor_6.png" alt="" className="home-logo-decor" width={200} height={12} loading="lazy" />
            <img src="/assets/ui/chillerkiller_logo.png" alt="Chiller & Killer Logo" className="home-logo-img" width={960} height={967} loading="lazy" />
            <img src="/assets/vip/components_decor_6.png" alt="" className="home-logo-decor flipped" width={200} height={12} loading="lazy" />
          </div>

          {/* ═══ Why Join ═══ */}
          <section className="card">
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("whyJoin", "title", t("whyJoinTitle"))}
                valueEn={cEn("whyJoin", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("whyJoin", "title", de, en)}
              />
              <a className="button primary" href="/auth/register">{t("applyNow")}</a>
            </div>
            <div className="card-body">
              <EditableText
                as="p"
                className="card-text-muted"
                value={c("whyJoin", "text", t("whyJoinText"))}
                valueEn={cEn("whyJoin", "text")}
                canEdit={canEdit}
                locale={locale}
                onSave={(de, en) => saveField("whyJoin", "text", de, en)}
              />
              <div className="list" style={{ marginTop: 12 }}>
                {(["feature1", "feature2", "feature3", "feature4", "feature5"] as const).map((key, i) => (
                  <div className="list-item" key={key}>
                    <EditableText
                      value={c("whyJoin", key, t(key))}
                      valueEn={cEn("whyJoin", key)}
                      canEdit={canEdit}
                      locale={locale}
                      singleLine
                      onSave={(de, en) => saveField("whyJoin", key, de, en)}
                    />
                    <span className="badge">{t(`${key}Badge` as "feature1Badge")}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ Public News ═══ */}
          <section className="card">
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("publicNews", "title", t("publicNews"))}
                valueEn={cEn("publicNews", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("publicNews", "title", de, en)}
              />
              <span className="badge">{t("publicNewsBadge")}</span>
            </div>
            <div className="card-body">
              <EditableText
                as="p"
                className="card-text-muted"
                value={c("publicNews", "text", t("publicNewsText"))}
                valueEn={cEn("publicNews", "text")}
                canEdit={canEdit}
                locale={locale}
                onSave={(de, en) => saveField("publicNews", "text", de, en)}
              />
              <div className="list" style={{ marginTop: 12 }}>
                {(["news1", "news2", "news3"] as const).map((key) => (
                  <div className="list-item" key={key}>
                    <EditableText
                      value={c("publicNews", key, t(key))}
                      valueEn={cEn("publicNews", key)}
                      canEdit={canEdit}
                      locale={locale}
                      singleLine
                      onSave={(de, en) => saveField("publicNews", key, de, en)}
                    />
                    <span className="badge">{t(`${key}Badge` as "news1Badge")}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ How It Works ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("howItWorks", "title", t("howItWorksTitle"))}
                valueEn={cEn("howItWorks", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("howItWorks", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="p"
                className="card-text-muted"
                value={c("howItWorks", "text1", t("howItWorksText1"))}
                valueEn={cEn("howItWorks", "text1")}
                canEdit={canEdit}
                locale={locale}
                onSave={(de, en) => saveField("howItWorks", "text1", de, en)}
              />
              <EditableText
                as="p"
                className="card-text-muted"
                value={c("howItWorks", "text2", t("howItWorksText2"))}
                valueEn={cEn("howItWorks", "text2")}
                canEdit={canEdit}
                locale={locale}
                onSave={(de, en) => saveField("howItWorks", "text2", de, en)}
              />
            </div>
          </section>

          {/* ═══ Contact ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("contact", "title", t("contactTitle"))}
                valueEn={cEn("contact", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("contact", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="p"
                className="card-text-muted"
                value={c("contact", "text", t("contactText"))}
                valueEn={cEn("contact", "text")}
                canEdit={canEdit}
                locale={locale}
                onSave={(de, en) => saveField("contact", "text", de, en)}
              />
              <div className="list" style={{ marginTop: 12 }}>
                <div className="list-item">
                  <EditableText
                    value={c("contact", "discord", t("contactDiscord"))}
                    valueEn={cEn("contact", "discord")}
                    canEdit={canEdit}
                    locale={locale}
                    singleLine
                    onSave={(de, en) => saveField("contact", "discord", de, en)}
                  />
                  <span className="badge">{t("contactDiscordBadge")}</span>
                </div>
                <div className="list-item">
                  <EditableText
                    value={c("contact", "email", t("contactEmail"))}
                    valueEn={cEn("contact", "email")}
                    canEdit={canEdit}
                    locale={locale}
                    singleLine
                    onSave={(de, en) => saveField("contact", "email", de, en)}
                  />
                  <span className="badge">{t("contactEmailBadge")}</span>
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                <a className="button primary" href="/auth/register">{t("joinTheChillers")}</a>
                <a className="button" href="/about">{t("learnMoreAbout")}</a>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

export default HomeClient;
