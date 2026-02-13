import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import PageShell from "../components/page-shell";
import PageSkeleton from "../components/page-skeleton";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings, notifications, and preferences.",
  alternates: { canonical: "/settings" },
};

export const dynamic = "force-dynamic";

/** Async content streamed via Suspense. */
async function SettingsContent(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const t = await getTranslations("settings");
  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("title")}
      heroSubtitle={t("accountDetails")}
      bannerSrc="/assets/banners/banner_tournir_kvk.png"
      contentClassName="settings-layout"
    >
      <SettingsClient userId={data.user.id} />
    </PageShell>
  );
}

/**
 * Settings page with Suspense streaming.
 */
function SettingsPage(): JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

export default SettingsPage;
