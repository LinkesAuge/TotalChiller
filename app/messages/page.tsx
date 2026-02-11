import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import PageSkeleton from "../components/page-skeleton";
import SectionHero from "../components/section-hero";
import MessagesClient from "./messages-client";

export const metadata: Metadata = {
  title: "Messages",
  description: "Direct messages, command broadcasts, and system notifications.",
};

export const dynamic = "force-dynamic";

interface MessagesPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Async content that requires auth — streamed via Suspense. */
async function MessagesContent({ initialRecipientId }: { readonly initialRecipientId?: string }): Promise<JSX.Element> {
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
        <MessagesClient userId={data.user.id} initialRecipientId={initialRecipientId} />
      </div>
    </>
  );
}

/**
 * Renders the messaging page with Suspense streaming.
 * Supports ?to=USER_ID to pre-fill the compose form with a recipient.
 */
async function MessagesPage({ searchParams }: MessagesPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const toParam = typeof params.to === "string" ? params.to : undefined;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MessagesContent initialRecipientId={toParam} />
    </Suspense>
  );
}

export default MessagesPage;
