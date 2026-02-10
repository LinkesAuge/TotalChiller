"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useSiteContent } from "../components/use-site-content";
import EditableText from "../components/editable-text";
import { LoadingSkeleton, ErrorBanner } from "../components/cms-shared";

function PrivacyClient(): JSX.Element {
  const t = useTranslations("privacyPolicy");
  const { canEdit, userId, supabase, locale, isLoaded, error, c, cEn, saveField } = useSiteContent("privacy");

  if (!isLoaded) {
    return (
      <>
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
          </div>
        </div>
        <div className="content-inner">
          <LoadingSkeleton rows={4} />
        </div>
      </>
    );
  }

  /* Build fallback from translation keys — all sections as one markdown block */
  const fallbackContent = [
    `## ${t("section1Title")}\n${t("section1Text")}`,
    `## ${t("section2Title")}\n${t("section2Text")}\n- **${locale === "de" ? "Kontodetails" : "Account Details"}** — ${t("section1Text").includes("E-Mail") ? "" : ""}E-Mail-Adresse, Benutzername\n- **${locale === "de" ? "Spielaufzeichnungen" : "Game Records"}** — In-Game-Daten\n- **${locale === "de" ? "Nutzungsaktivität" : "Usage Activity"}** — Server-Logs\n- **${locale === "de" ? "Authentifizierungstoken" : "Auth Tokens"}** — Sitzungs-Cookies`,
    `## ${t("section3Title")}\n${t("section3Text")}\n- ${t("section3Item1")}\n- ${t("section3Item2")}\n- ${t("section3Item3")}\n- ${t("section3Item4")}\n- ${t("section3Item5")}`,
    `## ${t("section4Title")}\n${t("section4Text")}`,
    `## ${t("section5Title")}\n${t("section5Text")}\n\n${t("section5Note")}`,
    `## ${t("section6Title")}\n${t("section6Text")}\n- ${t("section6Item1")}\n- ${t("section6Item2")}\n- ${t("section6Item3")}\n- ${t("section6Item4")}`,
    `## ${t("section7Title")}\n${t("section7Text")}`,
    `## ${t("section8Title")}\n${t("section8Text")}`,
    `## ${t("section9Title")}\n${t("section9Text")} [${t("section9ContactLink")}](/contact) ${t("section9OrDiscord")} [${t("section9HomeLink")}](/home) ${t("section9ForInfo")}`,
    `## ${t("section10Title")}\n${t("section10Text")}`,
  ].join("\n\n");

  return (
    <>
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
        </div>
      </div>
      <div className="content-inner">
        {error && <ErrorBanner message={error} />}
        <div className="grid">
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("policy", "title", t("cardTitle"))}
                valueEn={cEn("policy", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("policy", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                className="card-text-muted"
                value={c("policy", "byline", t("byline"))}
                valueEn={cEn("policy", "byline")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("policy", "byline", de, en)}
              />
              <EditableText
                as="div"
                value={c("policy", "content", fallbackContent)}
                valueEn={cEn("policy", "content")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("policy", "content", de, en)}
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default PrivacyClient;
