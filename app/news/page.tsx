import AuthActions from "../components/auth-actions";

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
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">War Prep Schedule</div>
              <div className="card-subtitle">Pinned • Clan Chillers</div>
            </div>
            <span className="badge">Announcement</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>42 comments</span>
              <span className="badge">Upvotes 120</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recruitment Status</div>
              <div className="card-subtitle">Public • Clan Chillers</div>
            </div>
            <span className="badge">News</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>18 comments</span>
              <span className="badge">Upvotes 58</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default NewsPage;
