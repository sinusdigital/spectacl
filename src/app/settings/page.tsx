'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container, Flex, Text, Box, Separator } from '@radix-ui/themes';
import { useToast } from '@/components/Shared/RadixToast';
import PageContainer from '@/components/Shared/PageContainer';
import Header from '@/components/Shared/Header';
import GeneralSettings from '@/components/Settings/GeneralSettings';
import MembersSettings from '@/components/Settings/MembersSettings';
import InvitationsSettings from '@/components/Settings/InvitationsSettings';
import type { SpaceInfo } from "@/components/Settings/UsageSettings";
import ModelsSettings from "@/components/Settings/ModelsSettings";
import DangerZoneSettings from '@/components/Settings/DangerZoneSettings';

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {children}
        </Text>
    );
}

function SettingsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { success: toastSuccess } = useToast();
    const [space, setSpace] = useState<SpaceInfo | null>(null);

    const fetchSpace = async () => {
        try {
            const res = await fetch("/api/spaces/current");
            const data = await res.json();
            setSpace(data);
        } catch (err) {
            console.error("Failed to fetch space info:", err);
        }
    };

    useEffect(() => {
        const payment = searchParams.get("payment");
        const plan = searchParams.get("plan");

        const init = async () => {
            if (payment === "success" && plan) {
                // Returning from Mollie after upgrade — confirm payment, reload data
                const spaceRes = await fetch("/api/spaces/current");
                const currentSpace = await spaceRes.json();

                await fetch("/api/mollie/confirm-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ spaceId: currentSpace.id, plan }),
                });
                toastSuccess("Plan activated! 🎉", `Your space is now on the ${plan} plan.`);
                await fetchSpace();
                router.refresh();
            } else {
                await fetchSpace();
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" width="100%" gap="4">
                            <Header.Content>
                                <Header.Title as="h1" size="4" weight="bold">Space Settings</Header.Title>
                            </Header.Content>
                            <Separator orientation="vertical" size="2" />
                            <Text size="2" color="gray">Manage your workspace configuration and team</Text>
                        </Flex>
                    ),
                    sticky: true,
                    zIndex: 20,
                }
            ]}
        >
            <Container size="3" p="6">
                <Flex direction="column" gap="8">
                    <Box>
                        <SectionLabel>General</SectionLabel>
                        <Box mt="3">
                            <GeneralSettings />
                        </Box>
                    </Box>

                    <Box>
                        <SectionLabel>Members & Invitations</SectionLabel>
                        <Box mt="3">
                            <MembersSettings />
                        </Box>
                        <Box mt="6">
                            <InvitationsSettings />
                        </Box>
                    </Box>

                    {space && space.llmProvider !== "MANAGED" && (
                        <Box>
                            <SectionLabel>API Keys</SectionLabel>
                            <Box mt="3">
                                <ModelsSettings />
                            </Box>
                        </Box>
                    )}

                    <Box>
                        <SectionLabel>Danger Zone</SectionLabel>
                        <Box mt="3">
                            <DangerZoneSettings />
                        </Box>
                    </Box>
                </Flex>
            </Container>
        </PageContainer>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div>Loading settings...</div>}>
            <SettingsPageContent />
        </Suspense>
    );
}
