import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import AdminClient from "./admin-client";
import AuthActions from "../components/auth-actions";
import AdminSectionBadge from "./admin-section-badge";
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AdminSectionBadge />
            <AuthActions />
          </div>
        </div>
      </div>
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
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton" style={{ height: 56, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 400, borderRadius: 8 }} />
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
