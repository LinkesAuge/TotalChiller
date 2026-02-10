"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSiteContent } from "../components/use-site-content";
import EditableText from "../components/editable-text";
import { LoadingSkeleton, ErrorBanner } from "../components/cms-shared";

function AboutClient(): JSX.Element {
  const t = useTranslations("about");
  const { canEdit, userId, supabase, locale, isLoaded, error, c, cEn, saveField } = useSiteContent("about");

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
          {/* ═══ Mission ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("mission", "title", t("missionTitle"))}
                valueEn={cEn("mission", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("mission", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                className="card-text-muted"
                value={c("mission", "byline", t("missionByline"))}
                valueEn={cEn("mission", "byline")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("mission", "byline", de, en)}
              />
              <EditableText
                as="div"
                value={c("mission", "text", `${t("missionText1")}\n\n${t("missionText2")}\n\n${t("missionText3")}`)}
                valueEn={cEn("mission", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("mission", "text", de, en)}
              />
            </div>
          </section>

          {/* ═══ What We Do ═══ */}
          <section className="card">
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("features", "title", t("featuresTitle"))}
                valueEn={cEn("features", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("features", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c(
                  "features",
                  "text",
                  [t("feature1"), t("feature2"), t("feature3"), t("feature4"), t("feature5")].join("\n"),
                )}
                valueEn={cEn("features", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("features", "text", de, en)}
              />
            </div>
          </section>

          {/* ═══ Values ═══ */}
          <section className="card">
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("values", "title", t("valuesTitle"))}
                valueEn={cEn("values", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("values", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c(
                  "values",
                  "text",
                  [t("value1"), t("value2"), t("value3"), t("value4"), t("value5")].join("\n"),
                )}
                valueEn={cEn("values", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("values", "text", de, en)}
              />
            </div>
          </section>

          {/* ═══ Technology ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("tech", "title", t("techTitle"))}
                valueEn={cEn("tech", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("tech", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c("tech", "text", `${t("techText2")}`)}
                valueEn={cEn("tech", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("tech", "text", de, en)}
              />
            </div>
          </section>

          {/* ═══ CTA ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            <div className="card-body">
              <EditableText
                as="div"
                value={c("cta", "text", t("ctaText"))}
                valueEn={cEn("cta", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("cta", "text", de, en)}
              />
              <div className="list inline" style={{ justifyContent: "center", marginTop: 16 }}>
                <Link className="button primary" href="/auth/register">
                  {t("applyForMembership")}
                </Link>
                <Link className="button" href="/contact">
                  {t("getInTouch")}
                </Link>
                <Link className="button" href="/home">
                  {t("visitHome")}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AboutClient;
