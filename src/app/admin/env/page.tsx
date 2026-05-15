"use client";

import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { EnvStatusWidget } from "@/components/Admin/EnvStatusWidget";

export default function EnvVarsPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="6">
                <Flex direction="column" gap="2">
                    <Heading size="6">Environment Variables</Heading>
                    <Text size="3" color="gray">
                        All environment variables required by the app and their current status.
                    </Text>
                </Flex>

                <EnvStatusWidget
                    groups="deployment"
                    title="Deployment Mode"
                    description="Controls whether billing, payments, and plan limits are active."
                />

                <EnvStatusWidget
                    groups="app"
                    title="Core"
                    description="Required for the app to function. Must be set in all environments."
                />

                <EnvStatusWidget
                    groups="llm"
                    title="LLM Providers"
                    description="API keys for AI model providers. At least one must be set for analysis to work."
                />

                <EnvStatusWidget
                    groups="payments"
                    title="Payments"
                    description="Mollie payment provider and billing infrastructure."
                />

                <EnvStatusWidget
                    groups="auth"
                    title="Authentication"
                    description="OAuth provider credentials for social login."
                />

                <EnvStatusWidget
                    groups="optional"
                    title="Optional"
                    description="Nice-to-have integrations. The app works without these."
                />
            </Flex>
        </Container>
    );
}
