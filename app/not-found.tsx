import type { Metadata } from "next";
import Link from "next/link";
import PageTopBar from "./components/page-top-bar";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The requested page does not exist.",
};

/**
 * Custom 404 page — shown when a route does not exist.
 */
export default function NotFound(): JSX.Element {
  return (
    <>
      <PageTopBar title="404 — Seite nicht gefunden" />
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn col-span-full">
            Die angeforderte Seite existiert nicht. / The requested page does not exist.
          </div>
          <section className="card">
            <div className="card-body leading-relaxed text-sm">
              <p className="m-0">Bitte überprüfe die URL oder navigiere zurück zur Startseite.</p>
            </div>
            <div className="list mt-4">
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
