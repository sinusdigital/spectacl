'use client';

import { Container, Flex, Text, Box, Separator } from '@radix-ui/themes';
import PageContainer from '@/components/Shared/PageContainer';
import Header from '@/components/Shared/Header';
import ProfileSettings from '@/components/UserSettings/ProfileSettings';
import SecuritySettings from '@/components/UserSettings/SecuritySettings';
import GdprSettings from '@/components/Settings/GdprSettings';
import DangerZoneSettings from '@/components/UserSettings/DangerZoneSettings';

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Text size="1" weight="bold" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {children}
        </Text>
    );
}

export default function UserSettingsPage() {
    return (
        <PageContainer
            headers={[
                {
                    content: (
                        <Flex align="center" width="100%" gap="4">
                            <Header.Content>
                                <Header.Title as="h1" size="4" weight="bold">User Settings</Header.Title>
                            </Header.Content>
                            <Separator orientation="vertical" size="2" />
                            <Text size="2" color="gray">Manage your personal account and preferences</Text>
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
                        <SectionLabel>Profile</SectionLabel>
                        <Box mt="3">
                            <ProfileSettings />
                        </Box>
                    </Box>

                    <Box>
                        <SectionLabel>Security</SectionLabel>
                        <Box mt="3">
                            <SecuritySettings />
                        </Box>
                    </Box>

                    <Box>
                        <SectionLabel>Privacy & Data</SectionLabel>
                        <Box mt="3">
                            <GdprSettings />
                        </Box>
                    </Box>

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
