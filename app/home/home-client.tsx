"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSiteContent, type ContentMap } from "../components/use-site-content";
import EditableText from "../components/editable-text";
import PublicAuthActions from "../components/public-auth-actions";

/* ─── EditableList Sub-component ─── */

interface EditableListProps {
  section: string;
  itemPrefix: string;
  badgePrefix: string;
  items: string[];
  canEdit: boolean;
  locale: string;
  content: ContentMap;
  onSave: (section: string, field: string, de: string, en: string) => Promise<void>;
  onAdd: (section: string, prefix: string) => Promise<void>;
  onRemove: (section: string, field: string) => Promise<void>;
  t: ReturnType<typeof useTranslations<"home">>;
}

/** Known translation keys under "home.*" to avoid MISSING_MESSAGE warnings */
const KNOWN_TRANSLATION_KEYS = new Set([
  "feature1", "feature2", "feature3", "feature4", "feature5",
  "feature1Badge", "feature2Badge", "feature3Badge", "feature4Badge", "feature5Badge",
  "news1", "news2", "news3",
  "news1Badge", "news2Badge", "news3Badge",
  "contactDiscord", "contactDiscordBadge", "contactEmail", "contactEmailBadge",
]);

function EditableList({
  section, itemPrefix, badgePrefix, items, canEdit, locale, content, onSave, onAdd, onRemove, t,
}: EditableListProps): JSX.Element {
  function cVal(field: string, fallback: string): string {
    const entry = content[section]?.[field];
    if (entry) {
      const val = locale === "en" ? entry.en : entry.de;
      if (val) return val;
    }
    return fallback;
  }
  function cEnVal(field: string): string {
    return content[section]?.[field]?.en ?? "";
  }

  /** Safely get a translation — returns empty string if key doesn't exist */
  function safeT(key: string): string {
    return KNOWN_TRANSLATION_KEYS.has(key) ? t(key as "feature1") : "";
  }

  return (
    <div className="list" style={{ marginTop: 12 }}>
      {items.map((key) => {
        const badgeFieldKey = `${key}${badgePrefix}`;
        const badgeValue = cVal(badgeFieldKey, safeT(badgeFieldKey));
        return (
          <div className="list-item" key={key}>
            {/* Item text — same for ALL users, edit only for admins */}
            <EditableText
              value={cVal(key, safeT(key) || key)}
              valueEn={cEnVal(key)}
              canEdit={canEdit}
              locale={locale}
              singleLine
              onSave={(de, en) => onSave(section, key, de, en)}
            />
            {/* Badge — visible to ALL users when it has content */}
            {badgeValue ? (
              canEdit ? (
                <EditableText
                  className="badge"
                  value={badgeValue}
                  valueEn={cEnVal(badgeFieldKey)}
                  canEdit={canEdit}
                  locale={locale}
                  singleLine
                  onSave={(de, en) => onSave(section, badgeFieldKey, de, en)}
                />
              ) : (
                <span className="badge">{badgeValue}</span>
              )
            ) : null}
            {/* Remove button — admin only */}
            {canEdit && (
              <button
                className="editable-list-remove"
                type="button"
                title="Entfernen"
                onClick={() => onRemove(section, key)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        );
      })}
      {/* Add button — admin only */}
      {canEdit && (
        <button
          className="editable-list-add"
          type="button"
          onClick={() => onAdd(section, itemPrefix)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {locale === "en" ? "Add item" : "Element hinzufügen"}
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ─── */

function HomeClient(): JSX.Element {
  const t = useTranslations("home");

  /* Use the SAME shared hook as About/Contact/Privacy pages */
  const { content, canEdit, userId, supabase, locale, isLoaded, c, cEn, saveField, setContent } =
    useSiteContent("home");

  /** Add a new list item to a section */
  async function addListItem(section: string, prefix: string): Promise<void> {
    const existing = Object.keys(content[section] ?? {}).filter((k) => k.startsWith(prefix) && /\d+$/.test(k));
    const nums = existing.map((k) => parseInt(k.replace(prefix, ""), 10)).filter((n) => !isNaN(n));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const newKey = `${prefix}${nextNum}`;
    await saveField(section, newKey, "Neuer Eintrag", "New item");
  }

  /** Remove a list item from a section — optimistic UI update, then DB delete */
  async function removeListItem(section: string, field: string): Promise<void> {
    const badgeKey = `${field}Badge`;
    /* Remove both item and its badge from local state immediately */
    setContent((prev) => {
      const sectionMap = { ...(prev[section] ?? {}) };
      delete sectionMap[field];
      delete sectionMap[badgeKey];
      return { ...prev, [section]: sectionMap };
    });
    /* Delete item + badge from DB in parallel */
    const deleteReq = (key: string) =>
      fetch("/api/site-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "home",
          section_key: section,
          field_key: key,
          _delete: true,
        }),
      });
    await Promise.all([deleteReq(field), deleteReq(badgeKey)]);
  }

  /* ─── Derive dynamic list keys from CMS content ─── */

  function deriveItems(sectionKey: string, prefix: string, fallback: string[]): string[] {
    const sectionData = content[sectionKey] ?? {};
    const allKeys = Object.keys(sectionData);
    const itemKeys = allKeys.filter((k) => k.startsWith(prefix) && !k.endsWith("Badge"));
    const withContent = itemKeys.filter((k) => {
      const e = sectionData[k];
      return e && (e.de || e.en);
    });
    if (withContent.length > 0) {
      return withContent.sort((a, b) => {
        const na = parseInt(a.replace(/\D+/g, ""), 10);
        const nb = parseInt(b.replace(/\D+/g, ""), 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        if (!isNaN(na)) return -1;
        if (!isNaN(nb)) return 1;
        return a.localeCompare(b);
      });
    }
    if (allKeys.length > 0) return [];
    return fallback;
  }

  const whyJoinItems = useMemo(
    () => deriveItems("whyJoin", "feature", ["feature1", "feature2", "feature3", "feature4", "feature5"]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content],
  );

  const publicNewsItems = useMemo(
    () => deriveItems("publicNews", "news", ["news1", "news2", "news3"]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content],
  );

  const contactItems = useMemo(
    () => deriveItems("contact", "contact", ["contactDiscord", "contactEmail"]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content],
  );

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

          {/* ═══ Über uns (with background image) ═══ */}
          <section className="card home-about-card" style={{ gridColumn: "1 / -1" }}>
            <div className="home-about-bg" />
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
                <div className="home-about-intro">
                  <EditableText
                    as="div"
                    value={c("aboutUs", "intro", t("missionText1"))}
                    valueEn={cEn("aboutUs", "intro")}
                    canEdit={canEdit}
                    locale={locale}
                    markdown
                    supabase={supabase}
                    userId={userId}
                    onSave={(de, en) => saveField("aboutUs", "intro", de, en)}
                  />
                </div>
                <div className="home-about-requirements">
                  <h4 className="home-about-section-title">{locale === "en" ? "Requirements" : "Voraussetzungen"}</h4>
                  <EditableText
                    as="div"
                    value={c("aboutUs", "requirements", t("aboutRequirements"))}
                    valueEn={cEn("aboutUs", "requirements")}
                    canEdit={canEdit}
                    locale={locale}
                    markdown
                    supabase={supabase}
                    userId={userId}
                    onSave={(de, en) => saveField("aboutUs", "requirements", de, en)}
                  />
                </div>
                <div className="home-about-apply">
                  <h4 className="home-about-section-title">{locale === "en" ? "Apply" : "Bewerbung"}</h4>
                  <EditableText
                    as="div"
                    value={c("aboutUs", "contact", t("aboutContact"))}
                    valueEn={cEn("aboutUs", "contact")}
                    canEdit={canEdit}
                    locale={locale}
                    markdown
                    supabase={supabase}
                    userId={userId}
                    onSave={(de, en) => saveField("aboutUs", "contact", de, en)}
                  />
                </div>
                <div className="home-about-extras">
                  <EditableText
                    as="div"
                    value={c("aboutUs", "extras", t("aboutExtras"))}
                    valueEn={cEn("aboutUs", "extras")}
                    canEdit={canEdit}
                    locale={locale}
                    markdown
                    supabase={supabase}
                    userId={userId}
                    onSave={(de, en) => saveField("aboutUs", "extras", de, en)}
                  />
                </div>
                <div className="home-about-disclaimer">
                  <EditableText
                    as="div"
                    value={c("aboutUs", "disclaimer", t("aboutDisclaimer"))}
                    valueEn={cEn("aboutUs", "disclaimer")}
                    canEdit={canEdit}
                    locale={locale}
                    markdown
                    supabase={supabase}
                    userId={userId}
                    onSave={(de, en) => saveField("aboutUs", "disclaimer", de, en)}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                  <a className="button primary" href="/about">{t("learnMoreAbout")}</a>
                </div>
              </div>
          </section>

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
                as="div"
                value={c("whyJoin", "text", t("whyJoinText"))}
                valueEn={cEn("whyJoin", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("whyJoin", "text", de, en)}
              />
              <EditableList
                section="whyJoin"
                itemPrefix="feature"
                badgePrefix="Badge"
                items={whyJoinItems}
                canEdit={canEdit}
                locale={locale}
                content={content}
                onSave={saveField}
                onAdd={addListItem}
                onRemove={removeListItem}
                t={t}
              />
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
                as="div"
                value={c("publicNews", "text", t("publicNewsText"))}
                valueEn={cEn("publicNews", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("publicNews", "text", de, en)}
              />
              <EditableList
                section="publicNews"
                itemPrefix="news"
                badgePrefix="Badge"
                items={publicNewsItems}
                canEdit={canEdit}
                locale={locale}
                content={content}
                onSave={saveField}
                onAdd={addListItem}
                onRemove={removeListItem}
                t={t}
              />
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
                as="div"
                className="card-text-muted"
                value={c("howItWorks", "text1", t("howItWorksText1"))}
                valueEn={cEn("howItWorks", "text1")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("howItWorks", "text1", de, en)}
              />
              <EditableText
                as="div"
                className="card-text-muted"
                value={c("howItWorks", "text2", t("howItWorksText2"))}
                valueEn={cEn("howItWorks", "text2")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
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
                as="div"
                className="card-text-muted"
                value={c("contact", "text", t("contactText"))}
                valueEn={cEn("contact", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("contact", "text", de, en)}
              />
              <EditableList
                section="contact"
                itemPrefix="contact"
                badgePrefix="Badge"
                items={contactItems}
                canEdit={canEdit}
                locale={locale}
                content={content}
                onSave={saveField}
                onAdd={addListItem}
                onRemove={removeListItem}
                t={t}
              />
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

export default HomeClient;
