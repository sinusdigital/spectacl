# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.

## [Unreleased]

## [0.2.1] - 2026-05-16

### Security
- **SSRF guard** for outbound `fetch` against user-supplied URLs. New `src/lib/url-guard.ts` resolves the hostname via DNS and refuses any address in the loopback, private, link-local, unique-local, reserved, multicast, benchmarking, carrier-grade NAT, unspecified, or broadcast ranges. Redirects are followed manually with per-hop re-validation. Applied to `logoScraper.ts` and `scraper.ts`, closing access from a malicious entity URL to cloud-instance metadata (e.g. `169.254.169.254`), RFC 1918 ranges, and `localhost`.
- **ReDoS** in `POST /api/spaces` slug generation replaced with a single-pass linear builder and a bounded input length.
- **ReDoS** in `HighlightedResponse` (LLM response highlighting) rewritten as a linear scan with depth-capped markdown link parsing — no more catastrophic backtracking on adversarial output.
- **HTML parsing via regex** in `scraper.ts` replaced with `cheerio` (was flagged as a bad HTML-filtering pattern).
- **Log injection / format-string** findings sanitized in `provider-models`, `debug/email`, `webhooks/mollie`, `logoUtils`, and `logoScraper` — user-controlled values are now passed as separate `console` arguments instead of interpolated into the format string.
- **GitHub Actions** `test.yml` workflow now runs with `permissions: contents: read` rather than the default broad `GITHUB_TOKEN`.

### Added
- `src/lib/url-guard.ts` with the `safeFetch` helper, backed by `ipaddr.js`.
- Sidebar version tag now reads from `package.json` via `NEXT_PUBLIC_APP_VERSION` (injected in `next.config.js`), so future releases only need one version bump.

## [0.2.0] - 2026-05-16

### Changed
- Lint baseline reset: cleared all 50 outstanding ESLint errors so the OSS push starts clean.

### Security
- Dependency bumps: `next` → 16.2.6, `better-auth` → 1.6, plus `hono` and `postcss` updates to clear the 18 open Dependabot CVE alerts.

## [0.1.0]

### Added
- Initial open-source release under MIT.
