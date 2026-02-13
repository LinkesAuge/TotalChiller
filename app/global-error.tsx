"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root-level error boundary that catches errors in the root layout itself.
 * Because the root layout may not render, this component provides its own
 * minimal <html>/<body> wrapper without relying on any app layout or i18n.
 */
export default function RootError({
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
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", color: "#e2e8f0", background: "#0f172a" }}>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Something went wrong</h1>
        <p style={{ marginBottom: "0.5rem" }}>{error.message || "An unexpected error occurred."}</p>
        {error.digest ? <p style={{ fontSize: "0.75rem", opacity: 0.6 }}>Error ID: {error.digest}</p> : null}
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #475569",
              borderRadius: "0.375rem",
              background: "#1e293b",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/home"
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #475569",
              borderRadius: "0.375rem",
              background: "#1e293b",
              color: "#e2e8f0",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
