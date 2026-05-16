import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink } from 'better-auth/plugins';
import { prisma } from './prisma';
import { resend } from './email';
import { renderEmail } from './send-email';
import { MagicLinkEmail } from '@/emails';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  ].filter((v, i, a) => a.indexOf(v) === i), // dedupe

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  account: {
    accountLinking: {
      // Auto-link Google OAuth to an existing user with the same email.
      // Safe: Google always returns verified emails, so whoever signs in as
      // that Google account provably owns the email. Without this, users who
      // signed up via magic link get `unable_to_link_account` when they later
      // try Google SSO with the same address.
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  plugins: [
    magicLink({
      expiresIn: 600, // 10 minutes — matches email copy
      sendMagicLink: async ({ email, url }: { email: string; url: string }) => {
        console.log(`[auth] sendMagicLink → to=${email}`);
        if (process.env.SKIP_MAGIC_LINK_EMAIL === 'true') {
          // localhost dev bypass: click the URL in your terminal to log in
          console.log(`\n[auth] magic link for ${email}\n→ ${url}\n`);
          return;
        }

        // Rewrite URL to intermediate page to defeat email link scanners
        // (Outlook Safe Links, Proofpoint, etc.) that pre-fetch URLs and
        // consume the single-use token before the real user clicks.
        // Original: /api/auth/magic-link/verify?token=...&callbackURL=...
        // Rewritten: /auth/verify?token=...&callbackURL=...
        const parsed = new URL(url);
        const token = parsed.searchParams.get('token') || '';
        const callbackURL = parsed.searchParams.get('callbackURL') || '/auth/callback';
        const safeUrl = new URL('/auth/verify', parsed.origin);
        safeUrl.searchParams.set('token', token);
        safeUrl.searchParams.set('callbackURL', callbackURL);

        const html = await renderEmail(MagicLinkEmail, { magicUrl: safeUrl.toString() });
        const result = await resend.emails.send({
          from: 'Spectacl <hello@mail.spectacl.org>',
          to: email,
          subject: 'Your sign-in link for Spectacl',
          html,
        });
        if (result.error) {
          console.error(`[auth] sendMagicLink failed:`, result.error);
        } else {
          console.log(`[auth] sendMagicLink sent → resend id=${result.data?.id}`);
        }
      },
    }),
  ],

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Block locked users from creating new sessions
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isLocked: true },
          });
          if (user?.isLocked) {
            throw new Error("Your account has been locked. Please contact support.");
          }
          return { data: session };
        },
      },
    },
    user: {
      create: {
        before: async (user) => {
          // Magic link signups have no name — derive from email prefix
          const updates: Record<string, unknown> = {};
          if (!user.name && user.email) {
            const prefix = user.email.split('@')[0];
            updates.name = prefix
              .replace(/[._-]+/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase());
          }
          // GDPR Art. 7(1): Record when user accepted ToS (by signing up)
          updates.tosAcceptedAt = new Date();
          return { data: { ...user, ...updates } };
        },
      },
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false // Don't allow user to set their own role during signup
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
