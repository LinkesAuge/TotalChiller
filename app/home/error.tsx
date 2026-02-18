"use client";

import GameButton from "../components/ui/game-button";

/**
 * Section-level error boundary.
 */
export default function SectionError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): JSX.Element {
  return (
    <div className="content-inner">
      <div className="grid">
        <div className="alert warn col-span-full">Something went wrong.</div>
        <section className="card">
          <div className="card-body leading-relaxed text-sm">
            <p className="m-0">{error.message || "An unexpected error occurred."}</p>
            {error.digest ? <p className="text-muted text-xs mt-2">Error ID: {error.digest}</p> : null}
          </div>
          <div className="list mt-4">
            <GameButton variant="ornate1" fontSize="0.6rem" type="button" onClick={reset}>
              Try again
            </GameButton>
            <a className="button" href="/home">
              Go home
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
