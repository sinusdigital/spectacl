import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b54df5054cde1e611b02efcf3f490273@o4511197796630528.ingest.de.sentry.io/4511197798137936",

  // Performance Monitoring — sample 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",
});
