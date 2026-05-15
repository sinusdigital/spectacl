# Spectacl

Track how your brand appears in AI-powered search results (ChatGPT, Claude, Perplexity, Gemini).

Spectacl is an open-source AI visibility tracker. Create entities (brands), add competitors, configure prompts (questions to ask AI models), and analyze how you show up compared to the competition.

- **Managed cloud**: [spectacl.org](https://spectacl.org) — hosted by Sinus Digital, no setup required
- **Self-hosted**: clone this repo and run it yourself, no license fees, no feature gating

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: Radix UI Themes + Tailwind CSS v4
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: better-auth (magic link + Google SSO)
- **Queue**: BullMQ + Redis (background analysis jobs)
- **Email**: Resend + React Email
- **Error Tracking**: Sentry
- **Payments** (cloud only): Mollie + @react-pdf/renderer for invoices
- **Testing**: Vitest

## Deployment Modes

Spectacl runs in one of two modes, controlled by `NEXT_PUBLIC_SPECTACL_MODE`:

| Mode | Value | Behavior |
|------|-------|----------|
| **Self-hosted** (default) | unset | Unlimited everything, no billing UI, no trial limits, no plan gating |
| **Cloud** | `cloud` | Mollie billing, trials, plan limits, invoices, VAT — used for the managed offering |

If you're self-hosting, leave `NEXT_PUBLIC_SPECTACL_MODE` unset and ignore all the Mollie/billing variables.

## Getting Started (Self-Hosted)

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 6+
- At least one LLM provider API key (OpenAI, Anthropic, Google, or Mistral)

### Setup

```bash
git clone https://github.com/sinusdigital/spectacl.git
cd spectacl

# Install dependencies (--force needed for React 19 peer deps)
npm install --force

# Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, REDIS_URL,
# BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL, and one LLM key

# Set up the database
npx prisma generate
npx prisma migrate deploy

# Run Next.js + the background worker concurrently
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Key Commands

```bash
npm run dev          # Next.js + worker (concurrent)
npm run build        # Production build (prisma + next + worker)
npm run worker       # Background worker only
npm test             # Run all tests
npm run test:watch   # Watch mode
npx prisma studio    # Database GUI
```

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── [entityId]/      # Entity pages (overview, prompts, competitors)
│   ├── admin/           # Admin dashboard
│   ├── api/             # API routes
│   ├── spaces/          # Workspace management
│   └── settings/        # Space settings
├── components/
│   ├── Billing/         # Billing address, country picker (cloud only)
│   ├── Charts/          # Recharts visualizations
│   ├── Shared/          # Reusable primitives
│   └── Sidebar/         # Navigation
├── emails/              # React Email templates
├── lib/
│   ├── billing/         # Tax, VIES, invoices, PDF, plans (cloud only)
│   ├── llm/             # LLM provider integrations
│   ├── queue/           # BullMQ queue + worker
│   └── metrics/         # Visibility calculations
├── hooks/
└── types/
```

## Architecture

### Multi-Tenancy

Spaces are the tenant boundary. Every entity, prompt, and invoice belongs to a space. Users can be members of multiple spaces with role-based access (Owner, Admin, Member).

### Analysis Pipeline

Prompts run on a configurable schedule (6h, 24h, 2d, 7d). The scheduler enqueues BullMQ jobs; the worker processes them with per-provider rate limiting (Bottleneck + Redis-backed distributed state) and feeds results into visibility metrics.

### Billing (Cloud Mode Only)

Mollie handles payments with full EU VAT compliance:
- 3 VAT scenarios: NL domestic (21%), EU reverse charge (0%), non-EU exempt (0%)
- Invoice generation with sequential numbering (`SPE-YYYY-NNNN`)
- Billing address + VIES VAT ID validation
- Webhook-driven subscription lifecycle

In self-hosted mode all of this is bypassed and credits are unlimited.

## Environment Variables

See [`.env.example`](./.env.example) for the full list.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | Yes | Redis for BullMQ + caching |
| `BETTER_AUTH_SECRET` | Yes | Auth session encryption |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `RESEND_API_KEY` | Yes | Transactional email |
| `OPENAI_API_KEY` | One LLM key needed | OpenAI models |
| `ANTHROPIC_API_KEY` | One LLM key needed | Claude models |
| `GOOGLE_API_KEY` | One LLM key needed | Gemini models |
| `MISTRAL_API_KEY` | One LLM key needed | Mistral models |
| `NEXT_PUBLIC_SPECTACL_MODE` | No | `cloud` to enable billing, otherwise self-hosted |
| `MOLLIE_API_KEY` | Cloud only | Payment processing |
| `CRON_SECRET` | Cloud only | Cron endpoint auth |

## Contributing

Pull requests welcome. For non-trivial changes, please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Submit a pull request

### Code Conventions

- TypeScript everywhere
- Radix UI Themes for components (no Heroicons, no Lucide)
- Co-located tests (`*.test.ts` next to source)
- Server components use `auth.ts`, client components use `auth-client.ts`
- Admin role check: always `session.user.role !== 'ADMIN'` (uppercase)

## License

[MIT](./LICENSE) © Sinus Digital B.V.

## Links

- **Managed cloud**: [spectacl.org](https://spectacl.org)
- **Issues**: [GitHub Issues](https://github.com/sinusdigital/spectacl/issues)
- **Company**: [Sinus Digital](https://sinusdigital.com)
