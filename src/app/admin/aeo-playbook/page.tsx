import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { AeoPlaybookTable } from "@/components/Admin/AeoPlaybookTable";

export default function AeoPlaybookPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="6">
                <Flex direction="column" gap="2">
                    <Heading size="6">AEO Playbook</Heading>
                    <Text size="3" color="gray">
                        The library of AEO tactics the suggestion engine recommends to entities. Edits here apply to the next <code>/analyze</code> run — no deploy needed. Add new tactics, deactivate stale ones, or preview the playbook against a real entity.
                    </Text>
                </Flex>
                <AeoPlaybookTable />
            </Flex>
        </Container>
    );
}
