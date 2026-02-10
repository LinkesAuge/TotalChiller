import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";

export const metadata: Metadata = {
  title: "Not Authorized",
  description: "You do not have permission to view this page.",
};

/**
 * Renders the unauthorized access page.
 */
async function NotAuthorizedPage(): Promise<JSX.Element> {
  const t = await getTranslations("notAuthorized");
  return (
    <>
      <PageTopBar title={t("title")} actions={<AuthActions />} />
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn col-span-full">{t("message")}</div>
          <section className="card">
            <div className="list">
              <Link className="button primary" href="/home">
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
