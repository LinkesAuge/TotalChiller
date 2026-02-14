import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import PageShell from "../components/page-shell";
import PageSkeleton from "../components/page-skeleton";
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
async function MessagesContent({
  initialRecipientId,
  initialTab,
}: {
  readonly initialRecipientId?: string;
  readonly initialTab?: string;
}): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const t = await getTranslations("messagesPage");
  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_captain.png"
    >
      <MessagesClient userId={data.user.id} initialRecipientId={initialRecipientId} initialTab={initialTab} />
    </PageShell>
  );
}

/**
 * Renders the messaging page with Suspense streaming.
 * Supports ?to=USER_ID to pre-fill the compose form with a recipient.
 */
async function MessagesPage({ searchParams }: MessagesPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const toParam = typeof params.to === "string" ? params.to : undefined;
  const tabParam = typeof params.tab === "string" ? params.tab : undefined;
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MessagesContent initialRecipientId={toParam} initialTab={tabParam} />
    </Suspense>
  );
}

export default MessagesPage;
