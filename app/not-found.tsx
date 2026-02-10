import Link from "next/link";
import PageTopBar from "./components/page-top-bar";

/**
 * Custom 404 page — shown when a route does not exist.
 */
export default function NotFound(): JSX.Element {
  return (
    <>
      <PageTopBar title="404 — Seite nicht gefunden" />
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn" style={{ gridColumn: "1 / -1" }}>
            Die angeforderte Seite existiert nicht. / The requested page does not exist.
          </div>
          <section className="card">
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
              <p style={{ margin: 0 }}>Bitte überprüfe die URL oder navigiere zurück zur Startseite.</p>
            </div>
            <div className="list" style={{ marginTop: 16 }}>
              <Link className="button primary" href="/home">
                Zur Startseite / Go home
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
