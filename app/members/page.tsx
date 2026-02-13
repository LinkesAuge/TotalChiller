import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import PageShell from "../components/page-shell";
import PageSkeleton from "../components/page-skeleton";
import MembersClient from "./members-client";

export const metadata: Metadata = {
  title: "Member Directory",
  description: "Browse clan members, ranks, and affiliations.",
  alternates: { canonical: "/members" },
};

export const dynamic = "force-dynamic";

/** Async content streamed via Suspense. */
async function MembersContent(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const t = await getTranslations("members");
  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_captain.png"
    >
      <MembersClient />
    </PageShell>
  );
}

/**
 * Member directory page with Suspense streaming.
 */
function MembersPage(): JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MembersContent />
    </Suspense>
  );
}

export default MembersPage;
