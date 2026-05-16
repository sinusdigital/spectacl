import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b54df5054cde1e611b02efcf3f490273@o4511197796630528.ingest.de.sentry.io/4511197798137936",

  // Release tag — ties each error to the version that produced it.
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Performance Monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay — capture 5% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // GDPR: mask all text and inputs to prevent capturing PII in session replays
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
