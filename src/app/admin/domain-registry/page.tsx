import { Container, Flex, Heading, Text, Section, Separator } from '@radix-ui/themes';
import { DomainRegistryTable } from '@/components/Admin/DomainRegistryTable';
import { DomainTypesTable } from '@/components/Admin/DomainTypesTable';

export default function DomainRegistryPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">
                <Flex direction="column" gap="2">
                    <Heading size="6">Domain Registry</Heading>
                    <Text size="3" color="gray">
                        Master catalog of known domains — categories, allowlist status, and type metadata.
                        Domains in the allowlist are included in global insights aggregations.
                        The type catalog defines what type options are available when classifying domains across the platform.
                    </Text>
                </Flex>

                <Section size="1">
                    <Flex direction="column" gap="4">
                        <Flex direction="column" gap="1">
                            <Heading size="4">Domains</Heading>
                            <Text size="2" color="gray">
                                Toggle the allowlist to control which domains appear in global AI citation benchmarks.
                            </Text>
                        </Flex>
                        <DomainRegistryTable />
                    </Flex>
                </Section>

                <Separator size="4" />

                <Section size="1">
                    <Flex direction="column" gap="4">
                        <Flex direction="column" gap="1">
                            <Heading size="4">Domain Types</Heading>
                            <Text size="2" color="gray">
                                Define the type options available when classifying a domain. Used throughout the platform in Sources, benchmarks, and filters.
                            </Text>
                        </Flex>
                        <DomainTypesTable />
                    </Flex>
                </Section>
            </Flex>
        </Container>
    );
}
