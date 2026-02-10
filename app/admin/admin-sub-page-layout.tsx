import { getTranslations } from "next-intl/server";
import AuthActions from "../components/auth-actions";
import AdminSectionTabs from "./admin-section-tabs";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";

/**
 * Shared server-side layout for admin sub-pages (data-table, data-import).
 *
 * Renders the common shell: PageTopBar → SectionHero → tabs → children.
 * Each sub-page only needs to provide its translation prefix, banner, and
 * client component.
 */

interface AdminSubPageLayoutProps {
  /** Translation key prefix under the "admin" namespace (e.g. "dataTable" or "dataImport"). */
  readonly section: string;
  /** Banner image path for SectionHero. */
  readonly bannerSrc: string;
  /** Page-specific client component. */
  readonly children: React.ReactNode;
}

export default async function AdminSubPageLayout({
  section,
  bannerSrc,
  children,
}: AdminSubPageLayoutProps): Promise<JSX.Element> {
  const t = await getTranslations("admin");
  return (
    <>
      <PageTopBar breadcrumb={t(`${section}.breadcrumb`)} title={t(`${section}.title`)} actions={<AuthActions />} />
      <SectionHero title={t(`${section}.heroTitle`)} subtitle={t(`${section}.heroSubtitle`)} bannerSrc={bannerSrc} />
      <div className="content-inner">
        <div className="admin-tabs-container">
          <AdminSectionTabs />
        </div>
        {children}
      </div>
    </>
  );
}
