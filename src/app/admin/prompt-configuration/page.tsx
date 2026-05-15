import { Container, Flex, Heading, Text, Section, Separator } from '@radix-ui/themes';
import { LanguagesTable } from '@/components/Admin/LanguagesTable';

export default function PromptConfigurationPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">
                <Flex direction="column" gap="2">
                    <Heading size="6">Prompt Configuration</Heading>
                    <Text size="3" color="gray">
                        Configure the options available when creating and managing prompts across the platform.
                    </Text>
                </Flex>

                <Section size="1">
                    <Flex direction="column" gap="4">
                        <Flex direction="column" gap="1">
                            <Heading size="4">Languages</Heading>
                            <Text size="2" color="gray">
                                Manage the language and market options available when creating prompts.
                                Languages are grouped by region and appear in the prompt creation forms.
                            </Text>
                        </Flex>
                        <LanguagesTable />
                    </Flex>
                </Section>
            </Flex>
        </Container>
    );
}
