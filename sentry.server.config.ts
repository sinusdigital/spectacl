import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b54df5054cde1e611b02efcf3f490273@o4511197796630528.ingest.de.sentry.io/4511197798137936",

  // Release tag — ties each error to the version that produced it.
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Performance Monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // GDPR: localVariablesIntegration removed — captures PII (emails, tokens, billing data)
  // from stack frames on errors. Stack traces alone are sufficient for debugging.

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
