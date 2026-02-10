"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import PageTopBar from "./components/page-top-bar";

/**
 * Global error boundary — catches unhandled client errors and reports to Sentry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <>
      <PageTopBar title="Fehler / Error" />
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn" style={{ gridColumn: "1 / -1" }}>
            Etwas ist schiefgelaufen. / Something went wrong.
          </div>
          <section className="card">
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
              <p style={{ margin: 0 }}>{error.message || "Ein unerwarteter Fehler ist aufgetreten."}</p>
              {error.digest ? (
                <p className="text-muted" style={{ fontSize: "0.75rem", marginTop: 8 }}>
                  Fehler-ID: {error.digest}
                </p>
              ) : null}
            </div>
            <div className="list" style={{ marginTop: 16 }}>
              <button className="button primary" type="button" onClick={reset}>
                Erneut versuchen / Try again
              </button>
              <a className="button" href="/home">
                Zur Startseite / Go home
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
