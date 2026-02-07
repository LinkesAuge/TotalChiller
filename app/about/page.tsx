import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "About The Chillers",
  description:
    "Learn about The Chillers — a competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
  alternates: { canonical: "/about" },
};

/**
 * Renders the About page for E-E-A-T compliance and trust building.
 */
async function AboutPage(): Promise<JSX.Element> {
  const t = await getTranslations("about");
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
          {/* Mission */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("missionTitle")}</div>
                <div className="card-subtitle">{t("missionSubtitle")}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                {t("missionByline")}
              </p>
              <p>{t("missionText1")}</p>
              <p style={{ marginTop: 12 }}>{t("missionText2")}</p>
              <p style={{ marginTop: 12 }}>{t("missionText3")}</p>
            </div>
          </section>
          {/* What We Do */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("featuresTitle")}</div>
                <div className="card-subtitle">{t("featuresSubtitle")}</div>
              </div>
            </div>
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
          </section>
          {/* Values */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("valuesTitle")}</div>
                <div className="card-subtitle">{t("valuesSubtitle")}</div>
              </div>
            </div>
            <div className="list">
              <div className="list-item"><span>{t("value1")}</span></div>
              <div className="list-item"><span>{t("value2")}</span></div>
              <div className="list-item"><span>{t("value3")}</span></div>
              <div className="list-item"><span>{t("value4")}</span></div>
              <div className="list-item"><span>{t("value5")}</span></div>
            </div>
          </section>
          {/* Technology */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("techTitle")}</div>
                <div className="card-subtitle">{t("techSubtitle")}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p dangerouslySetInnerHTML={{ __html: t.raw("techText1") }} />
              <p style={{ marginTop: 12 }}>{t("techText2")}</p>
            </div>
          </section>
          {/* CTA */}
          <section className="card" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            <div className="card-body">
              <p style={{ fontSize: "0.9rem", marginBottom: 16 }}>{t("ctaText")}</p>
              <div className="list inline" style={{ justifyContent: "center" }}>
                <Link className="button primary" href="/auth/register">{t("applyForMembership")}</Link>
                <Link className="button" href="/contact">{t("getInTouch")}</Link>
                <Link className="button" href="/home">{t("visitHome")}</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AboutPage;
