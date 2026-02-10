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
          <div className="alert warn col-span-full">Etwas ist schiefgelaufen. / Something went wrong.</div>
          <section className="card">
            <div className="card-body leading-relaxed text-sm">
              <p className="m-0">{error.message || "Ein unerwarteter Fehler ist aufgetreten."}</p>
              {error.digest ? <p className="text-muted text-xs mt-2">Fehler-ID: {error.digest}</p> : null}
            </div>
            <div className="list mt-4">
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
