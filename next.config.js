const { withSentryConfig } = require("@sentry/nextjs");
const pkg = require("./package.json");

/** @type {import('next').NextConfig} */
// Force restart: 1
const nextConfig = {
    env: {
        NEXT_PUBLIC_APP_VERSION: pkg.version,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-App-Version', value: pkg.version },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob:",
                            "font-src 'self'",
                            "connect-src 'self' https://*.ingest.de.sentry.io",
                            "frame-src 'self' blob:",
                            "frame-ancestors 'none'",
                        ].join('; '),
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                ],
            },
        ];
    },
    async redirects() {
        return [
            { source: '/forgot-password', destination: '/login', permanent: false },
            { source: '/reset-password', destination: '/login', permanent: false },
        ];
    },
    output: 'standalone',
    typescript: {
        ignoreBuildErrors: true,
    },
images: {
        remotePatterns: [],
        localPatterns: [
            {
                pathname: '/**',
                search: '',
            },
        ],
    },
    productionBrowserSourceMaps: false,
    experimental: {
        // Reduce memory usage during build
        workerThreads: false,
        cpus: 1,
    },
};

module.exports = withSentryConfig(nextConfig, {
  // Use Sentry's tunneling to avoid ad blockers
  tunnelRoute: "/monitoring",

  // Suppress noisy source map upload logs during build
  silent: !process.env.CI,

  // Disable source map upload (no SENTRY_AUTH_TOKEN configured yet)
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  org: "sinus-digital-bv",
  project: "javascript-nextjs",
});
