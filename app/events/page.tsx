import AuthActions from "../components/auth-actions";
import ClanScopeBanner from "../components/clan-scope-banner";
import EventsClient from "./events-client";

/**
 * Renders the events calendar page shell.
 */
function EventsPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Clan Events</div>
        <div className="actions">
          <button className="button">Month</button>
          <button className="button">Week</button>
          <button className="button primary">Create Event</button>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <ClanScopeBanner />
        <EventsClient />
      </div>
    </>
  );
}

export default EventsPage;
