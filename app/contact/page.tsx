import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Contact [THC] Chiller & Killer",
  description:
    "Get in touch with [THC] Chiller & Killer clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
  alternates: { canonical: "/contact" },
};

/**
 * Renders the Contact page for E-E-A-T compliance and trust building.
 */
async function ContactPage(): Promise<JSX.Element> {
  const t = await getTranslations("contact");
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="Ornate page header" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
        </div>
      </div>
      <div className="content-inner">
        <div className="grid">
          {/* Contact Methods */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("getInTouchTitle")}</div>
                <div className="card-subtitle">{t("getInTouchSubtitle")}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem", paddingBottom: 0 }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                {t("byline")}
              </p>
              <p style={{ margin: 0 }}>{t("introText")}</p>
            </div>
            <div className="list">
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{t("discord")}</div>
                  <div className="text-muted">{t("discordDesc")}</div>
                </div>
                <span className="badge">{t("discordBadge")}</span>
              </div>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{t("emailTitle")}</div>
                  <div className="text-muted">{t("emailDesc")}</div>
                </div>
                <span className="badge">{t("emailBadge")}</span>
              </div>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{t("inGame")}</div>
                  <div className="text-muted">{t("inGameDesc")}</div>
                </div>
                <span className="badge">{t("inGameBadge")}</span>
              </div>
            </div>
          </section>
          {/* Recruitment */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("joinTitle")}</div>
                <div className="card-subtitle">{t("joinSubtitle")}</div>
              </div>
              <span className="badge">{t("joinBadge")}</span>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p>{t("joinText")}</p>
              <p style={{ marginTop: 10 }}>
                {t("joinMoreInfo")} <Link href="/about" style={{ color: "var(--color-gold)" }}>{t("aboutPage")}</Link>,{" "}
                {t("orVisit")} <Link href="/home" style={{ color: "var(--color-gold)" }}>{t("homePage")}</Link>{" "}
                {t("forOverview")}
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                <Link className="button primary" href="/auth/register">{t("applyForMembership")}</Link>
                <Link className="button" href="/auth/login">{t("existingMemberSignIn")}</Link>
              </div>
            </div>
          </section>
          {/* Response Times */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("responseTitle")}</div>
                <div className="card-subtitle">{t("responseSubtitle")}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem", paddingBottom: 0 }}>
              <p style={{ margin: 0 }}>{t("responseIntro")}</p>
            </div>
            <div className="list">
              <div className="list-item">
                <span>{t("responseDiscord")}</span>
                <span className="badge">{t("responseDiscordBadge")}</span>
              </div>
              <div className="list-item">
                <span>{t("responseEmail")}</span>
                <span className="badge">{t("responseEmailBadge")}</span>
              </div>
              <div className="list-item">
                <span>{t("responseRecruitment")}</span>
                <span className="badge">{t("responseRecruitmentBadge")}</span>
              </div>
              <div className="list-item">
                <span>{t("responsePrivacy")}</span>
                <span className="badge">{t("responsePrivacyBadge")}</span>
              </div>
            </div>
          </section>
          {/* FAQ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("faqTitle")}</div>
                <div className="card-subtitle">{t("faqSubtitle")}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p style={{ margin: 0 }}>
                <strong>{t("faq1Question")}</strong> {t("faq1Start")}{" "}
                <Link href="/auth/register" style={{ color: "var(--color-gold)" }}>{t("faq1Link")}</Link>.{" "}
                {t("faq1End")}
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>{t("faq2Question")}</strong> {t("faq2Start")}{" "}
                <Link href="/auth/forgot" style={{ color: "var(--color-gold)" }}>{t("faq2Link")}</Link>{" "}
                {t("faq2End")}
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>{t("faq3Question")}</strong> {t("faq3Start")}{" "}
                <Link href="/about" style={{ color: "var(--color-gold)" }}>{t("faq3AboutLink")}</Link>{" "}
                {t("faq3Mid")}{" "}
                <Link href="/home" style={{ color: "var(--color-gold)" }}>{t("faq3HomeLink")}</Link>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default ContactPage;
