"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Flex, Box } from "@radix-ui/themes";
import TrialBanner from "@/components/Shared/TrialBanner";
import CancellationBanner from "@/components/Shared/CancellationBanner";
import UpgradeSuccessBanner from "@/components/Shared/UpgradeSuccessBanner";
import MobileTabBar from "./Sidebar/MobileTabBar";
import MobileDrawer from "./Sidebar/MobileDrawer";
import PaymentReturnHandler from "@/components/PaymentReturnHandler";
import SpaceLockedModal from "@/components/Shared/SpaceLockedModal";
import TrialExpiredModal from "@/components/Shared/TrialExpiredModal";
import DunningBanner from "@/components/Shared/DunningBanner";
import SupportModeBanner from "@/components/Shared/SupportModeBanner";
import { isSelfHosted } from "@/lib/mode";


export default function AppShell({
    children,
    sidebar,
    currentSpace,
    supportMode,
    supportEmail,
}: {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    currentSpace?: {
        id: string;
        name: string;
        trialEndsAt: Date | string | null;
        currentPeriodEnd: Date | string | null;
        subscriptionStatus: string;
        isLocked: boolean;
    } | null;
    supportMode?: {
        spaceId: string;
        spaceName: string;
        writeEnabled: boolean;
    } | null;
    supportEmail?: string;
}) {
    const pathname = usePathname();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const cloudMode = !isSelfHosted();

    // Suppress stale banners while confirm-payment is in flight — the layout still has
    // the old subscription status. Cleared when PaymentReturnHandler emits 'payment-resolved'.
    // (Cloud mode only — self-hosted has no payment flow.)
    const [isPaymentReturn, setIsPaymentReturn] = useState(() =>
        cloudMode &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('payment') === 'pending'
    );

    useEffect(() => {
        if (!cloudMode || !isPaymentReturn) return;
        const handler = () => setIsPaymentReturn(false);
        window.addEventListener('payment-resolved', handler);
        return () => window.removeEventListener('payment-resolved', handler);
    }, [cloudMode, isPaymentReturn]);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
    );

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Reset more menu on navigation — intentional: this is a UI reset, not external sync
    useEffect(() => { setIsMoreMenuOpen(false); }, [pathname]); // eslint-disable-line react-hooks/set-state-in-effect

    // Routes that should use exact matching (e.g. single pages)
    const exactNoSidebarRoutes = [
        '/login',
        '/signup',
        '/offboarding'
    ];

    // Routes that should use prefix matching (e.g. entire folders)
    const prefixNoSidebarRoutes = [
        '/invite',
        '/onboarding',
        '/auth'
    ];

    const shouldShowSidebar = 
        !exactNoSidebarRoutes.includes(pathname) && 
        !prefixNoSidebarRoutes.some(route => pathname.startsWith(route));

    const isAdminPage = pathname.startsWith('/admin');
    const isSpacesPage = pathname.startsWith('/spaces');

    // Capture mount time once — avoids calling impure Date.now() on every render.
    // Trial expiry re-evaluates on navigation (server layout provides fresh currentSpace).
    const [mountTime] = useState(() => Date.now());

    // Detect expired trial (cloud mode only — self-hosted has no trials).
    const isTrialExpired = cloudMode && currentSpace && !currentSpace.isLocked && (
        currentSpace.subscriptionStatus === 'INCOMPLETE' ||
        (
            currentSpace.subscriptionStatus === 'TRIALING' &&
            currentSpace.trialEndsAt !== null &&
            new Date(currentSpace.trialEndsAt).getTime() < mountTime
        )
    );

    return (
        <Flex direction="column" height="100vh" overflow="hidden">
            {/* Support-mode banner — app admin viewing a non-member space */}
            {supportMode && shouldShowSidebar && (
                <SupportModeBanner
                    spaceId={supportMode.spaceId}
                    spaceName={supportMode.spaceName}
                    writeEnabled={supportMode.writeEnabled}
                />
            )}

            {/* Payment handler — cloud mode only */}
            {cloudMode && <PaymentReturnHandler />}

            {/* Admin space lock — works in both modes (not billing-related).
                Skipped when the viewer is an app admin in support mode so they
                can still inspect the locked space. */}
            {currentSpace?.isLocked && !isAdminPage && !isSpacesPage && !supportMode && (
                <SpaceLockedModal spaceName={currentSpace.name} supportEmail={supportEmail} />
            )}

            {/* Billing banners & modals — cloud mode only */}
            {cloudMode && isTrialExpired && !isPaymentReturn && !isAdminPage && !isSpacesPage && !supportMode && (
                <TrialExpiredModal spaceName={currentSpace?.name} spaceId={currentSpace?.id} />
            )}
            {cloudMode && shouldShowSidebar && !isPaymentReturn && !supportMode && currentSpace?.subscriptionStatus === 'PAST_DUE' && (
                <DunningBanner
                    spaceName={currentSpace.name}
                    spaceId={currentSpace.id}
                />
            )}
            {cloudMode && shouldShowSidebar && !isPaymentReturn && currentSpace?.subscriptionStatus === 'CANCELED' && (
                <CancellationBanner
                    spaceName={currentSpace.name}
                    accessEndsAt={currentSpace.currentPeriodEnd ?? currentSpace.trialEndsAt ?? new Date()}
                    spaceId={currentSpace.id}
                />
            )}
            {cloudMode && shouldShowSidebar && <UpgradeSuccessBanner />}
            {cloudMode && shouldShowSidebar && !isPaymentReturn && currentSpace?.subscriptionStatus !== 'CANCELED' && (
                <TrialBanner
                    spaceName={currentSpace?.name}
                    trialEndsAt={currentSpace?.trialEndsAt}
                    subscriptionStatus={currentSpace?.subscriptionStatus}
                    spaceId={currentSpace?.id}
                />
            )}
            <Flex flexGrow="1" overflow="hidden" position="relative">
                {shouldShowSidebar && (
                    <Box 
                        width="256px" 
                        flexShrink="0" 
                        display={{ initial: 'none', md: 'block' }}
                        className="border-r border-[var(--gray-4)]"
                    >
                        {sidebar}
                    </Box>
                )}
                <Flex
                    direction="column"
                    flexGrow="1"
                    position="relative"
                    overflow="hidden"
                    height="100%"
                    className={`bg-[var(--color-background)] transition-all duration-300 ease-in-out ${shouldShowSidebar ? 'mobile-nav-padding' : ''}`}
                >

                    <Box asChild flexGrow="1" overflowY="auto" className="mobile-content-container" style={{ position: 'relative', zIndex: 1 }}>
                        <main>
                            {children}
                        </main>
                    </Box>
                </Flex>

                {shouldShowSidebar && (
                    <>
                        <MobileTabBar 
                            onMoreClick={() => setIsMoreMenuOpen(true)} 
                            isMoreOpen={isMoreMenuOpen} 
                        />
                        {isMobile && (
                            <MobileDrawer 
                                open={isMoreMenuOpen} 
                                onOpenChange={setIsMoreMenuOpen} 
                                sidebar={sidebar}
                            />
                        )}
                    </>
                )}
            </Flex>
        </Flex>
    );
}
