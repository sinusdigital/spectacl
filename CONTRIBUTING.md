# Contributing to Spectacl

Thanks for your interest in contributing! This document covers the practical bits — how to get a dev environment running, what to check before opening a PR, and how we work with contributors.

## Before you start

- For non-trivial changes, **open an issue first** so we can align on direction before you spend time on it. Bug fixes and small improvements don't need this — go straight to a PR.
- Check open issues and PRs to avoid duplicate work.
- Security issues — **do not open a public issue**. See [SECURITY.md](./SECURITY.md).

## Development setup

Prerequisites:
- Node.js 20+
- PostgreSQL 15+
- Redis 6+
- One LLM provider API key (OpenAI, Anthropic, Google, or Mistral)

```bash
git clone https://github.com/sinusdigital/spectacl.git
cd spectacl
npm install --force          # --force for React 19 peer deps
cp .env.example .env         # fill in DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, one LLM key
npx prisma generate
npx prisma migrate deploy
npm run dev                  # Next.js + background worker concurrently
```

Run in self-hosted mode by leaving `NEXT_PUBLIC_SPECTACL_MODE` unset — billing, trials, and plan limits are bypassed.

## Branching & commits

- Branch from `main`: `feature/short-description`, `fix/short-description`, `docs/short-description`
- Commit format: `type: short description` (Conventional Commits — `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`)
- Keep commits focused. Squash noise locally before pushing.

## What to check before opening a PR

- `npm test` passes
- `npm run build` completes without new warnings
- Type checks clean (`tsc --noEmit` runs as part of build)
- New code has tests where it makes sense (utilities, business logic, billing math)
- No new dependencies on `@heroicons/react` or `lucide-react` — use `@radix-ui/react-icons`
- No `alert()` or `console.log` left behind
- Migrations: if you changed `prisma/schema.prisma`, include the generated migration

## Code conventions

- TypeScript everywhere
- Radix UI Themes for components — no Heroicons, no Lucide
- Co-located tests: `foo.test.ts` next to `foo.ts`, no separate `__tests__` directories
- Server components import `auth.ts`; client components import `auth-client.ts`
- Admin role check is always uppercase: `session.user.role !== "ADMIN"`
- `src/lib/cache.ts` uses `ioredis` (Node-only) — never import it from files reachable by client components

## Pull request flow

1. Push your branch and open a PR against `main`
2. Fill in the PR template — what changed and why, plus how you verified it
3. Link the issue your PR closes (`Closes #123`)
4. CI runs on every PR — fix any failures before requesting review
5. Be patient with reviews — we're a small team

By submitting a PR you agree to license your contribution under the project's [MIT License](./LICENSE).

## What we're unlikely to merge

- Pure cosmetic refactors with no behavior change
- Adding new icon libraries or UI frameworks
- Features that only make sense for a specific deployment and add cloud/self-hosted divergence
- Anything that breaks self-hosted mode without a strong reason

## Questions?

Open a [Discussion](https://github.com/sinusdigital/spectacl/discussions) or an issue. For private/security topics, see [SECURITY.md](./SECURITY.md).
