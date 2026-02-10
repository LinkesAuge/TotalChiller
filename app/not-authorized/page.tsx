import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";

export const metadata: Metadata = {
  title: "Not Authorized",
  description: "You do not have permission to view this page.",
};

interface NotAuthorizedPageProps {
  readonly searchParams: Promise<{ reason?: string }>;
}

/**
 * Renders the unauthorized access page with context-specific messaging.
 * When reason=admin, shows an admin-specific denial message.
 */
async function NotAuthorizedPage({ searchParams }: NotAuthorizedPageProps): Promise<JSX.Element> {
  const params = await searchParams;
  const isAdminDenied = params.reason === "admin";
  const t = await getTranslations("notAuthorized");
  const messageKey = isAdminDenied ? "adminMessage" : "message";
  return (
    <>
      <PageTopBar title={t("title")} actions={<AuthActions />} />
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn col-span-full">{t(messageKey)}</div>
          <section className="card">
            <div className="list flex gap-3">
              {!isAdminDenied && (
                <Link className="button primary" href="/profile">
                  {t("goProfile")}
                </Link>
              )}
              <Link className={isAdminDenied ? "button primary" : "button"} href="/home">
                {t("goHome")}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default NotAuthorizedPage;
