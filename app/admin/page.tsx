import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import AdminClient from "./admin-client";
import AuthActions from "../components/auth-actions";
import AdminSectionBadge from "./admin-section-badge";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Clan administration — user management, approvals, validation rules, and audit logs.",
};

/** Async content streamed via Suspense. */
async function AdminContent(): Promise<JSX.Element> {
  const t = await getTranslations("admin");
  return (
    <>
      <PageTopBar
        breadcrumb={t("breadcrumb")}
        title={t("title")}
        actions={
          <>
            <AdminSectionBadge />
            <AuthActions />
          </>
        }
      />
      <SectionHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_tournir_kvk.png"
      />
      <div className="content-inner">
        <AdminClient />
      </div>
    </>
  );
}

/**
 * Renders the admin panel page shell with Suspense streaming.
 */
function AdminPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="content-inner">
          <div className="grid">
            <div className="col-span-full flex flex-col gap-4">
              <div className="skeleton h-14 rounded-lg" />
              <div className="skeleton h-[200px] rounded-lg" />
              <div className="skeleton h-[400px] rounded-lg" />
            </div>
          </div>
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

export default AdminPage;
