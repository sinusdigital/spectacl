import { Container, Flex, Heading, Text, Section, Separator, Card } from '@radix-ui/themes';
import AdminSettings from '@/components/Admin/AdminSettings';
import SellerInfoForm from '@/components/Admin/SellerInfoForm';

export default function SettingsPage() {
    return (
        <Container size="3" className="max-w-5xl py-8">
            <Flex direction="column" gap="8">
                <Flex direction="column" gap="2">
                    <Heading size="6">Settings</Heading>
                    <Text size="3" color="gray">
                        Global application settings, feature flags, and sidebar visibility controls.
                    </Text>
                </Flex>

                <AdminSettings />

                <Separator size="4" />

                <Flex direction="column" gap="4">
                    <Flex direction="column" gap="2">
                        <Heading size="4">Seller / Invoice Details</Heading>
                        <Text size="2" color="gray">
                            Your company details as they appear on customer invoices. Changes apply to new invoices only.
                        </Text>
                    </Flex>
                    <Card>
                        <SellerInfoForm />
                    </Card>
                </Flex>
            </Flex>
        </Container>
    );
}
