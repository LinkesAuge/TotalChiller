import AuthActions from "../components/auth-actions";
import ClanScopeBanner from "../components/clan-scope-banner";
import NewsClient from "./news-client";

/**
 * Renders the news and announcements page shell.
 */
function NewsPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">News & Announcements</div>
        <div className="actions">
          <button className="button">Filter</button>
          <button className="button primary">Create Post</button>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <ClanScopeBanner />
        <NewsClient />
      </div>
    </>
  );
}

export default NewsPage;
