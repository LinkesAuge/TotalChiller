import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";
import MessagesClient from "./messages-client";

export const metadata: Metadata = {
  title: "Messages",
  description: "Direct messages, command broadcasts, and system notifications.",
};

export const dynamic = "force-dynamic";

/** Async content that requires auth — streamed via Suspense. */
async function MessagesContent(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const t = await getTranslations("messagesPage");
  return (
    <>
      <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
      <SectionHero title={t("heroTitle")} subtitle={t("heroSubtitle")} bannerSrc="/assets/banners/banner_captain.png" />
      <div className="content-inner">
        <MessagesClient userId={data.user.id} />
      </div>
    </>
  );
}

/**
 * Renders the messaging page with Suspense streaming.
 */
function MessagesPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="content-inner">
          <div className="grid">
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton" style={{ height: 56, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

export default MessagesPage;
