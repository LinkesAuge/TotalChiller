import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AuthActions from "../components/auth-actions";

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
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <h1 className="top-bar-title">{t("title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <div className="content-inner">
      <div className="grid">
        <div className="alert warn" style={{ gridColumn: "1 / -1" }}>
          {t("message")}
        </div>
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
