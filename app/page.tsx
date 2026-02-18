import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../lib/supabase/server-client";
import PageShell from "./components/page-shell";
import PageSkeleton from "./components/page-skeleton";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your clan hub — announcements, events, stats, and progress.",
  alternates: { canonical: "/" },
};

export const dynamic = "force-dynamic";

/** Async content streamed via Suspense. */
async function DashboardContent(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const t = await getTranslations("dashboard");
  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <DashboardClient />
    </PageShell>
  );
}

/**
 * Dashboard page with Suspense streaming.
 */
function DashboardPage(): JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <DashboardContent />
    </Suspense>
  );
}

export default DashboardPage;
