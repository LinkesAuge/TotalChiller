import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import AuthActions from "../components/auth-actions";
import SectionHero from "../components/section-hero";
import MessagesClient from "./messages-client";

export const metadata: Metadata = {
  title: "Messages",
  description: "Direct messages, command broadcasts, and system notifications.",
};

export const dynamic = "force-dynamic";

/**
 * Renders the messaging page with authentication guard.
 */
async function MessagesPage(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const t = await getTranslations("messagesPage");
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("breadcrumb")}</div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <SectionHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_captain.png"
      />
      <div className="content-inner">
        <MessagesClient userId={data.user.id} />
      </div>
    </>
  );
}

export default MessagesPage;
