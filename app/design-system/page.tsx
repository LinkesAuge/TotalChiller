import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import PageShell from "../components/page-shell";
import PageSkeleton from "../components/page-skeleton";
import DesignSystemClient from "./design-system-client";

export const metadata: Metadata = {
  title: "Design System",
  description: "Asset library, UI inventory, and design token management for the Fortress Sanctum design system.",
};

/** Async content streamed via Suspense. */
async function DesignSystemContent(): Promise<JSX.Element> {
  const t = await getTranslations("designSystem");
  return (
    <PageShell breadcrumb={t("breadcrumb")} title={t("pageTitle")}>
      <DesignSystemClient />
    </PageShell>
  );
}

/**
 * Design System page — admin-only tool for managing game assets,
 * UI element inventory, and asset-to-element assignments.
 */
function DesignSystemPage(): JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton variant="admin" />}>
      <DesignSystemContent />
    </Suspense>
  );
}

export default DesignSystemPage;
