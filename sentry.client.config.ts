import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  /* Only enable in production */
  enabled: process.env.NODE_ENV === "production",

  /* Environment and release for filtering in Sentry dashboard */
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,

  /* Capture 10% of transactions for performance monitoring */
  tracesSampleRate: 0.1,

  /* Capture 100% of errors */
  replaysOnErrorSampleRate: 1.0,

  /* Capture 5% of sessions for replay */
  replaysSessionSampleRate: 0.05,

  /* Strip PII: don't send IP addresses or user-agent strings */
  sendDefaultPii: false,

  integrations: [
    Sentry.replayIntegration({
      /* Mask all text and block all media in replays for privacy */
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  /* Scrub sensitive data from event payloads */
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }
    return event;
  },
});
