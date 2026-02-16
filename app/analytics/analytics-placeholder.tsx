"use client";

import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import PageShell from "@/app/components/page-shell";

/**
 * Placeholder page shown while analytics features are being rebuilt.
 * Displays a styled "coming soon" card with a decorative chart icon.
 */
function AnalyticsPlaceholder(): ReactElement {
  const t = useTranslations("analytics");

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      <div className="content-inner">
        <section className="card col-span-2">
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
            {/* Decorative bar chart icon */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-gold-2)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ opacity: 0.6 }}
            >
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>

            <p
              className="text-center m-0"
              style={{
                color: "var(--color-text-2)",
                fontSize: "0.95rem",
                maxWidth: 360,
              }}
            >
              {t("comingSoon")}
            </p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default AnalyticsPlaceholder;
