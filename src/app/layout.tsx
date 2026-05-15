import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "@radix-ui/themes/styles.css";
import "@/styles/radix-colors.css";
import "./globals.css";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getCurrentSpace } from "@/lib/spaces";
import { isSupportWriteMode, getSupportSpaceId } from "@/lib/support-mode";
import { SystemSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { Theme } from "@radix-ui/themes";
import { ClientProviders } from "@/components/providers";
import AppShell from "@/components/AppShell";
import SidebarServerWrapper from "@/components/SidebarServerWrapper";
import HeartbeatProvider from "@/components/HeartbeatProvider";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Spectacl",
  description: "Track your brand's visibility in AI",
  icons: {
    icon: [
      {
        url: "/icon-dark.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon-light.png",
        media: "(prefers-color-scheme: light)",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentSpace = session?.user ? await getCurrentSpace(session.user.id) : null;

  // Admin-configurable support email (Admin → Settings). Fall back to the
  // shared contact address if unset or the DB read fails.
  const supportEmail =
    (await SystemSettings.get("support_email").catch(() => null)) ??
    "hello@spectacl.org";

  // Detect admin support-mode. The banner shows whenever the support-space
  // cookie is set (so admins always have an Exit affordance), regardless of
  // whether resolveSpaceAccess reports them as member or admin-override.
  let supportMode: { spaceId: string; spaceName: string; writeEnabled: boolean } | null = null;
  if (session?.user) {
    const supportSpaceId = await getSupportSpaceId();
    if (supportSpaceId) {
      // Resolve the target space name even if the admin is currently viewing
      // a different space (e.g. navigated to /spaces).
      const targetSpace =
        currentSpace?.id === supportSpaceId
          ? currentSpace
          : await prisma.space.findUnique({
              where: { id: supportSpaceId },
              select: { id: true, name: true },
            });
      if (targetSpace) {
        supportMode = {
          spaceId: targetSpace.id,
          spaceName: targetSpace.name,
          writeEnabled: await isSupportWriteMode(targetSpace.id),
        };
      }
    }
  }

  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <ClientProviders>
          <Theme accentColor="lime" grayColor="slate" radius="medium" scaling="100%" hasBackground={false}>
            <HeartbeatProvider />
            <AppShell
              sidebar={<SidebarServerWrapper currentSpace={currentSpace} />}
              currentSpace={currentSpace ? {
                id: currentSpace.id,
                name: currentSpace.name,
                trialEndsAt: currentSpace.trialEndsAt,
                currentPeriodEnd: currentSpace.currentPeriodEnd,
                subscriptionStatus: currentSpace.subscriptionStatus,
                isLocked: currentSpace.isLocked,
              } : null}
              supportMode={supportMode}
              supportEmail={supportEmail}
            >
                {children}
            </AppShell>
          </Theme>
        </ClientProviders>
      </body>
    </html>
  );
}
