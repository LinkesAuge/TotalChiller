"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import PageTopBar from "./components/page-top-bar";
import GameButton from "./components/ui/game-button";

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
  const t = useTranslations("errorPage");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <>
      <PageTopBar title={t("title")} />
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn col-span-full">{t("heading")}</div>
          <section className="card">
            <div className="card-body leading-relaxed text-sm">
              <p className="m-0">{error.message || t("fallbackMessage")}</p>
              {error.digest ? (
                <p className="text-muted text-xs mt-2">{t("errorId", { digest: error.digest })}</p>
              ) : null}
            </div>
            <div className="list mt-4">
              <GameButton variant="ornate1" fontSize="0.6rem" type="button" onClick={reset}>
                {t("retry")}
              </GameButton>
              <a className="button" href="/home">
                {t("goHome")}
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
