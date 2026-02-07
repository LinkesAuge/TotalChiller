import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicAuthActions from "../components/public-auth-actions";

export const metadata: Metadata = {
  title: "The Chillers Community Hub",
  description:
    "Welcome to The Chillers — a focused Total Battle clan built around teamwork, planning, and data-driven play. Join our community hub.",
  alternates: { canonical: "/home" },
};

/**
 * Renders the public landing page with Sanctum medieval hero design.
 */
async function HomePage(): Promise<JSX.Element> {
  const t = await getTranslations("home");
  return (
    <>
      {/* Ornate top bar */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="Ornate page header" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PublicAuthActions />
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="hero-banner">
        <div className="hero-overlay" />
        <img
          src="/assets/banners/banner_gold_dragon.webp"
          alt={t("heroBannerAlt")}
          className="hero-bg"
          width={1200}
          height={300}
          loading="eager"
          fetchPriority="high"
        />
        <img
          src="/assets/vip/decor_light_1.png"
          alt="Ambient hero light effect"
          className="hero-light"
          width={400}
          height={400}
          loading="eager"
        />
        <div className="hero-content">
          <img
            src="/assets/vip/components_decor_6.png"
            alt="Ornamental horizontal rule"
            className="hero-decor"
            width={300}
            height={20}
            loading="lazy"
          />
          <h2 className="hero-title">{t("heroTitle")}</h2>
          <p className="hero-subtitle">{t("heroSubtitle")}</p>
          <img
            src="/assets/vip/components_decor_6.png"
            alt="Ornamental horizontal rule"
            className="hero-decor flipped"
            width={300}
            height={20}
            loading="lazy"
          />
        </div>
      </div>

      <div className="content-inner">
        <div className="grid">
          {/* Clan Mission */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="tooltip-head">
              <img
                src="/assets/vip/back_tooltip_2.png"
                alt="Card header decorative background"
                className="tooltip-head-bg"
                width={400}
                height={44}
                loading="lazy"
              />
              <div className="tooltip-head-inner">
                <img
                  src="/assets/vip/batler_icons_stat_damage.png"
                  alt="Clan mission icon"
                  width={18}
                  height={18}
                  loading="lazy"
                />
                <h3 className="card-title">{t("missionTitle")}</h3>
                <span className="pin-badge">{t("missionBadge")}</span>
              </div>
            </div>
            <div className="card-body">
              <p style={{ margin: 0 }}>{t("missionText1")}</p>
              <p style={{ margin: "12px 0 0" }}>{t("missionText2")}</p>
            </div>
          </section>

          {/* Why Join */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t("whyJoinTitle")}</h3>
              <a className="button primary" href="/auth/register">
                {t("applyNow")}
              </a>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>{t("whyJoinText")}</p>
              <div className="list">
                <div className="list-item">
                  <span>{t("feature1")}</span>
                  <span className="badge">{t("feature1Badge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("feature2")}</span>
                  <span className="badge">{t("feature2Badge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("feature3")}</span>
                  <span className="badge">{t("feature3Badge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("feature4")}</span>
                  <span className="badge">{t("feature4Badge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("feature5")}</span>
                  <span className="badge">{t("feature5Badge")}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Public News */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">{t("publicNews")}</h3>
              <span className="badge">{t("publicNewsBadge")}</span>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>{t("publicNewsText")}</p>
              <div className="list">
                <div className="list-item">
                  <span>{t("news1")}</span>
                  <span className="badge">{t("news1Badge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("news2")}</span>
                  <span className="badge">{t("news2Badge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("news3")}</span>
                  <span className="badge">{t("news3Badge")}</span>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">{t("howItWorksTitle")}</h3>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>{t("howItWorksText1")}</p>
              <p style={{ margin: "12px 0 0", fontSize: "0.88rem" }}>{t("howItWorksText2")}</p>
            </div>
          </section>

          {/* Contact */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">{t("contactTitle")}</h3>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>{t("contactText")}</p>
              <div className="list">
                <div className="list-item">
                  <span>{t("contactDiscord")}</span>
                  <span className="badge">{t("contactDiscordBadge")}</span>
                </div>
                <div className="list-item">
                  <span>{t("contactEmail")}</span>
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

export default HomePage;
