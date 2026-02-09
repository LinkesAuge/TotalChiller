"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSiteContent } from "../components/use-site-content";
import EditableText from "../components/editable-text";

function ContactClient(): JSX.Element {
  const t = useTranslations("contact");
  const { canEdit, userId, supabase, locale, isLoaded, c, cEn, saveField } = useSiteContent("contact");

  if (!isLoaded) {
    return (
      <>
        <div className="top-bar">
          <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
          <div className="top-bar-inner">
            <div>
              <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
              <h1 className="top-bar-title">{t("title")}</h1>
            </div>
          </div>
        </div>
        <div className="content-inner"><div className="alert info loading">Laden...</div></div>
      </>
    );
  }

  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
        </div>
      </div>
      <div className="content-inner">
        <div className="grid">

          {/* ═══ Contact Methods ═══ */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("getInTouch", "title", t("getInTouchTitle"))}
                valueEn={cEn("getInTouch", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("getInTouch", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c("getInTouch", "intro", t("introText"))}
                valueEn={cEn("getInTouch", "intro")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("getInTouch", "intro", de, en)}
              />
              <EditableText
                as="div"
                value={c("getInTouch", "methods", `**${t("discord")}**\n${t("discordDesc")}\n\n**${t("emailTitle")}**\n${t("emailDesc")}\n\n**${t("inGame")}**\n${t("inGameDesc")}`)}
                valueEn={cEn("getInTouch", "methods")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("getInTouch", "methods", de, en)}
              />
            </div>
          </section>

          {/* ═══ Recruitment ═══ */}
          <section className="card">
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("join", "title", t("joinTitle"))}
                valueEn={cEn("join", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("join", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c("join", "text", t("joinText"))}
                valueEn={cEn("join", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("join", "text", de, en)}
              />
              <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                <Link className="button primary" href="/auth/register">{t("applyForMembership")}</Link>
                <Link className="button" href="/auth/login">{t("existingMemberSignIn")}</Link>
              </div>
            </div>
          </section>

          {/* ═══ Response Times ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("response", "title", t("responseTitle"))}
                valueEn={cEn("response", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("response", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c("response", "text", `${t("responseIntro")}\n\n- ${t("responseDiscord")} — ${t("responseDiscordBadge")}\n- ${t("responseEmail")} — ${t("responseEmailBadge")}\n- ${t("responseRecruitment")} — ${t("responseRecruitmentBadge")}\n- ${t("responsePrivacy")} — ${t("responsePrivacyBadge")}`)}
                valueEn={cEn("response", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("response", "text", de, en)}
              />
            </div>
          </section>

          {/* ═══ FAQ ═══ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <EditableText
                as="h3"
                className="card-title"
                value={c("faq", "title", t("faqTitle"))}
                valueEn={cEn("faq", "title")}
                canEdit={canEdit}
                locale={locale}
                singleLine
                onSave={(de, en) => saveField("faq", "title", de, en)}
              />
            </div>
            <div className="card-body">
              <EditableText
                as="div"
                value={c("faq", "text", `**${t("faq1Question")}** ${t("faq1Start")} [${t("faq1Link")}](/auth/register). ${t("faq1End")}\n\n**${t("faq2Question")}** ${t("faq2Start")} [${t("faq2Link")}](/auth/forgot) ${t("faq2End")}\n\n**${t("faq3Question")}** ${t("faq3Start")} [${t("faq3AboutLink")}](/about) ${t("faq3Mid")} [${t("faq3HomeLink")}](/home).`)}
                valueEn={cEn("faq", "text")}
                canEdit={canEdit}
                locale={locale}
                markdown
                supabase={supabase}
                userId={userId}
                onSave={(de, en) => saveField("faq", "text", de, en)}
              />
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

export default ContactClient;
