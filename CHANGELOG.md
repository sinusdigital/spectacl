# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.

## [Unreleased]

## [0.2.2] - 2026-05-19

### Fixed
- **Invite signup flow:** `/invite/[token]/accept` converted from a Server Component to a Route Handler. Setting cookies in a Server Component throws at runtime (`Cookies can only be modified in a Server Action or Route Handler`), which was crashing the page mid-render *after* the DB transaction had already created the `SpaceMember` and flipped the invitation to `ACCEPTED` — leaving invitees stuck on "Invalid Invitation" / "Invalid Token" / "site can't be reached" depending on what they tried next.
- **Invite accept is now idempotent:** if the user is already a member of the space, the route sets the `current-space-id` cookie and redirects to the workspace instead of bouncing back to `/invite/[token]` (which then errored because the invitation was no longer `PENDING`).
- **Absolute `callbackURL` on magic-link signup** from the invite page, anchored to `window.location.origin` — defends against a misconfigured `BETTER_AUTH_URL` resolving relative paths to `http://localhost:3000`.
- **Settings → Members & Invitations dialogs** now actually render. The component referenced CSS classes (`dialog-content`, `dialog-overlay`) that aren't defined anywhere in the codebase, so the raw `@radix-ui/react-dialog` opened invisibly on click. Migrated to the shared `Modal` component used everywhere else.
- **Metrics:** prompt 7d / 30d / 90d columns now populated by the `success` analysis status (was filtering on a value that no longer matched the pipeline).
- **Insights:** y-axis domain labels render on the global citations chart.

### Changed
- **Role-based UI gating in Settings:** invite forms and management buttons hidden from regular Members; the Danger Zone section (label + body) hidden from non-Owners. No more empty section headers.
- **`/admin/users` space cards** now list every entity in each space, not only entities created by the user being viewed (`Entity.userId` was misleading — the authoritative scope is `Entity.spaceId`).
- **`/api/spaces/current`** now exposes `currentUserRole` and `canManageMembers` so the client can render the right view without a second fetch.
- **`AnalysisStatus` TypeScript union** aligned with the `'success'` pipeline value.

### Added
- Gotcha entry in `CLAUDE.md` documenting that `cookies().set()` is only legal inside Server Actions and Route Handlers, with the invite-accept route as a worked example.

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
