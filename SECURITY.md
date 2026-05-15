# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately via one of:

- GitHub's [private vulnerability reporting](https://github.com/sinusdigital/spectacl/security/advisories/new)
- Email: **security@sinusdigital.nl**

When reporting, please include:

- A description of the issue and the impact
- Steps to reproduce (proof-of-concept where possible)
- Affected version, branch, or commit hash
- Your name / handle if you'd like credit in the advisory

## What to expect

- **Acknowledgement** within 3 business days
- **Initial assessment** within 7 business days, including severity and rough timeline
- **Coordinated disclosure** — we'll agree on a public disclosure date with you before publishing the advisory
- **Credit** in the GitHub Security Advisory unless you'd prefer to remain anonymous

We do not currently run a paid bug bounty program, but we genuinely appreciate responsible disclosure and will credit reporters publicly.

## Scope

In scope:

- The Spectacl codebase in this repository
- The managed cloud at `spectacl.org` and `app.spectacl.org`
- Authentication, authorization, multi-tenancy boundaries
- Billing, invoicing, and webhook handling
- Data exposure between spaces or users

Out of scope:

- Issues that require a compromised user account or device
- Social engineering of Sinus Digital staff or customers
- Denial-of-service attacks against the managed cloud
- Findings from automated scanners without a working proof-of-concept
- Missing security headers on non-sensitive endpoints

## Supported versions

Spectacl is pre-1.0. We currently only support the `main` branch. If you're self-hosting from an older commit, please update before reporting — fixes are not backported.

## Safe harbor

If you make a good-faith effort to comply with this policy, we will:

- Not pursue legal action against you
- Work with you to understand and resolve the issue quickly
- Recognize your contribution publicly (if you'd like)

Good-faith means: don't access more data than necessary to demonstrate the issue, don't degrade service availability, don't exfiltrate or retain customer data, and give us reasonable time to fix before disclosing.
