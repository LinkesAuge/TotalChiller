"use client";

/**
 * HomeClient — Homepage mit vollständigem CMS.
 *
 * Uses the unified useSiteContent hook with text content (site_content)
 * and list items (site_list_items). All markdown rendering via AppMarkdown.
 * No more inline EditableList, deriveItems, or normalizeContent.
 */

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSiteContent } from "../components/use-site-content";
import EditableText from "../components/editable-text";
import EditableList from "../components/editable-list";
import CmsPageShell from "../components/cms-page-shell";
import PublicAuthActions from "../components/public-auth-actions";

/* ─── Main Component ─── */

function HomeClient(): JSX.Element {
  const t = useTranslations("home");

  const {
    lists,
    canEdit,
    userId,
    supabase,
    locale,
    isLoaded,
    error,
    c,
    cEn,
    cDe,
    saveField,
    addListItem,
    updateListItem,
    removeListItem,
    reorderListItems,
  } = useSiteContent("home");

  /* ── Hero banner (rendered between top bar and content when loaded) ── */
  const heroBanner = (
    <div className="hero-banner">
      <div className="hero-overlay" />
      <Image
        src="/assets/banners/banner_gold_dragon.webp"
        alt={t("heroBannerAlt")}
        className="hero-bg"
        width={1200}
        height={300}
        priority
      />
      <Image src="/assets/vip/decor_light_1.png" alt="" className="hero-light" width={400} height={400} priority />
      <div className="hero-content">
        <Image src="/assets/vip/components_decor_6.png" alt="" className="hero-decor" width={300} height={20} />
        <h2 className="hero-title">{t("heroTitle")}</h2>
        <p className="hero-subtitle">{t("heroSubtitle")}</p>
        <Image src="/assets/vip/components_decor_6.png" alt="" className="hero-decor flipped" width={300} height={20} />
      </div>
    </div>
  );

  return (
    <CmsPageShell
      title={t("title")}
      actions={<PublicAuthActions />}
      heroSlot={heroBanner}
      isLoaded={isLoaded}
      error={error}
      contentClassName="content-constrained"
    >
      {/* ═══ Über uns (with background image) ═══ */}
      <section className="card home-about-card col-span-full">
        <div className="home-about-bg" />
        <div className="tooltip-head">
          <Image src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
          <div className="tooltip-head-inner">
            <Image src="/assets/vip/batler_icons_stat_damage.png" alt="" width={18} height={18} />
            <EditableText
              as="h3"
              className="card-title"
              value={c("aboutUs", "title", t("missionTitle"))}
              valueEn={cEn("aboutUs", "title")}
              valueDe={cDe("aboutUs", "title")}
              canEdit={canEdit}
              locale={locale}
              singleLine
              onSave={(de, en) => saveField("aboutUs", "title", de, en)}
            />
            <span className="pin-badge">
              <EditableText
                value={c("aboutUs", "badge", t("missionBadge"))}
                valueEn={cEn("aboutUs", "badge")}
                valueDe={cDe("aboutUs", "badge")}
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
              valueDe={cDe("aboutUs", "intro")}
              canEdit={canEdit}
              locale={locale}
              markdown
              supabase={supabase}
              userId={userId}
              onSave={(de, en) => saveField("aboutUs", "intro", de, en)}
            />
          </div>
          <div className="home-about-requirements">
            <h4 className="home-about-section-title">{t("requirementsTitle")}</h4>
            <EditableText
              as="div"
              value={c("aboutUs", "requirements", t("aboutRequirements"))}
              valueEn={cEn("aboutUs", "requirements")}
              valueDe={cDe("aboutUs", "requirements")}
              canEdit={canEdit}
              locale={locale}
              markdown
              supabase={supabase}
              userId={userId}
              onSave={(de, en) => saveField("aboutUs", "requirements", de, en)}
            />
          </div>
          <div className="home-about-apply">
            <h4 className="home-about-section-title">{t("applyTitle")}</h4>
            <EditableText
              as="div"
              value={c("aboutUs", "contact", t("aboutContact"))}
              valueEn={cEn("aboutUs", "contact")}
              valueDe={cDe("aboutUs", "contact")}
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
              valueDe={cDe("aboutUs", "extras")}
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
              valueDe={cDe("aboutUs", "disclaimer")}
              canEdit={canEdit}
              locale={locale}
              markdown
              supabase={supabase}
              userId={userId}
              onSave={(de, en) => saveField("aboutUs", "disclaimer", de, en)}
            />
          </div>
          <div className="flex justify-center mt-4">
            <a className="button primary" href="/about">
              {t("learnMoreAbout")}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ Why Join ═══ */}
      <section className="card home-whyjoin-card col-span-full">
        <div className="home-whyjoin-bg" />
        <div className="tooltip-head">
          <Image src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
          <div className="tooltip-head-inner">
            <Image src="/assets/vip/batler_icons_stat_damage.png" alt="" width={18} height={18} />
            <EditableText
              as="h3"
              className="card-title"
              value={c("whyJoin", "title", t("whyJoinTitle"))}
              valueEn={cEn("whyJoin", "title")}
              valueDe={cDe("whyJoin", "title")}
              canEdit={canEdit}
              locale={locale}
              singleLine
              onSave={(de, en) => saveField("whyJoin", "title", de, en)}
            />
          </div>
        </div>
        <div className="card-body home-whyjoin-body">
          <EditableText
            as="div"
            value={c("whyJoin", "text", t("whyJoinText"))}
            valueEn={cEn("whyJoin", "text")}
            valueDe={cDe("whyJoin", "text")}
            canEdit={canEdit}
            locale={locale}
            markdown
            supabase={supabase}
            userId={userId}
            onSave={(de, en) => saveField("whyJoin", "text", de, en)}
          />
          <EditableList
            items={lists["whyJoin"] ?? []}
            canEdit={canEdit}
            locale={locale}
            onAdd={(de, en, extra) => addListItem("whyJoin", de, en, extra)}
            onUpdate={updateListItem}
            onRemove={removeListItem}
            onReorder={reorderListItems}
            showBadges
            supabase={supabase}
            userId={userId}
          />
          <div className="flex justify-center mt-4">
            <a className="button primary" href="/auth/register">
              {t("applyNow")}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ Clan News ═══ */}
      <section className="card">
        <div className="card-header">
          <EditableText
            as="h3"
            className="card-title"
            value={c("publicNews", "title", t("publicNews"))}
            valueEn={cEn("publicNews", "title")}
            valueDe={cDe("publicNews", "title")}
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
            valueDe={cDe("publicNews", "text")}
            canEdit={canEdit}
            locale={locale}
            markdown
            supabase={supabase}
            userId={userId}
            onSave={(de, en) => saveField("publicNews", "text", de, en)}
          />
          <EditableList
            items={lists["publicNews"] ?? []}
            canEdit={canEdit}
            locale={locale}
            onAdd={(de, en, extra) => addListItem("publicNews", de, en, extra)}
            onUpdate={updateListItem}
            onRemove={removeListItem}
            onReorder={reorderListItems}
            showBadges
            supabase={supabase}
            userId={userId}
          />
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="card col-span-full">
        <div className="card-header">
          <EditableText
            as="h3"
            className="card-title"
            value={c("howItWorks", "title", t("howItWorksTitle"))}
            valueEn={cEn("howItWorks", "title")}
            valueDe={cDe("howItWorks", "title")}
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
            valueDe={cDe("howItWorks", "text1")}
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
            valueDe={cDe("howItWorks", "text2")}
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
      <section className="card col-span-full">
        <div className="card-header">
          <EditableText
            as="h3"
            className="card-title"
            value={c("contact", "title", t("contactTitle"))}
            valueEn={cEn("contact", "title")}
            valueDe={cDe("contact", "title")}
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
            valueDe={cDe("contact", "text")}
            canEdit={canEdit}
            locale={locale}
            markdown
            supabase={supabase}
            userId={userId}
            onSave={(de, en) => saveField("contact", "text", de, en)}
          />
          <EditableList
            items={lists["contact"] ?? []}
            canEdit={canEdit}
            locale={locale}
            onAdd={(de, en, extra) => addListItem("contact", de, en, extra)}
            onUpdate={updateListItem}
            onRemove={removeListItem}
            onReorder={reorderListItems}
            showBadges
            supabase={supabase}
            userId={userId}
          />
        </div>
      </section>
    </CmsPageShell>
  );
}

export default HomeClient;
