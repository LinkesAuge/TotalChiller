import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  /* Only enable in production */
  enabled: process.env.NODE_ENV === "production",

  /* Capture 10% of transactions for performance monitoring */
  tracesSampleRate: 0.1,

  /* Capture 100% of errors */
  replaysOnErrorSampleRate: 1.0,

  /* Capture 5% of sessions for replay */
  replaysSessionSampleRate: 0.05,

  integrations: [Sentry.replayIntegration()],
});
