import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection",
  description:
    "TotalChiller privacy policy — learn how we collect, use, and protect your personal data within The Chillers Total Battle community platform.",
  alternates: { canonical: "/privacy-policy" },
};

/**
 * Renders the privacy policy page for legal compliance and E-E-A-T.
 */
async function PrivacyPolicyPage(): Promise<JSX.Element> {
  const t = await getTranslations("privacyPolicy");
  const lastUpdated = "February 7, 2026";

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
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">{t("cardTitle")}</div>
                <div className="card-subtitle">{t("lastUpdated")}: {lastUpdated}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                {t("byline")}
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section1Title")}</h2>
              <p>{t("section1Text")}</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section2Title")}</h2>
              <p>{t("section2Text")}</p>
              <ul style={{ paddingLeft: 20 }}>
                <li dangerouslySetInnerHTML={{ __html: t.raw("section2Item1") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("section2Item2") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("section2Item3") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("section2Item4") }} />
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section3Title")}</h2>
              <p>{t("section3Text")}</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>{t("section3Item1")}</li>
                <li>{t("section3Item2")}</li>
                <li>{t("section3Item3")}</li>
                <li>{t("section3Item4")}</li>
                <li>{t("section3Item5")}</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section4Title")}</h2>
              <p>{t("section4Text")}</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section5Title")}</h2>
              <p>{t("section5Text")}</p>
              <ul style={{ paddingLeft: 20 }}>
                <li dangerouslySetInnerHTML={{ __html: t.raw("section5Item1") }} />
                <li dangerouslySetInnerHTML={{ __html: t.raw("section5Item2") }} />
              </ul>
              <p>{t("section5Note")}</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section6Title")}</h2>
              <p>{t("section6Text")}</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>{t("section6Item1")}</li>
                <li>{t("section6Item2")}</li>
                <li>{t("section6Item3")}</li>
                <li>{t("section6Item4")}</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section7Title")}</h2>
              <p>{t("section7Text")}</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section8Title")}</h2>
              <p>{t("section8Text")}</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section9Title")}</h2>
              <p>
                {t("section9Text")}{" "}
                <Link href="/contact" style={{ color: "var(--color-gold)" }}>{t("section9ContactLink")}</Link>{" "}
                {t("section9OrDiscord")}{" "}
                <Link href="/home" style={{ color: "var(--color-gold)" }}>{t("section9HomeLink")}</Link>{" "}
                {t("section9ForInfo")}
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("section10Title")}</h2>
              <p>{t("section10Text")}</p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default PrivacyPolicyPage;
