import { Container, Flex, Heading, Text, Section } from '@radix-ui/themes';
import { EnvStatusWidget } from '@/components/Admin/EnvStatusWidget';
import { GlobalModelsTable } from '@/components/Admin/GlobalModelsTable';
import { InternalTaskModelsTable } from '@/components/Admin/InternalTaskModelsTable';
import { AeoCooldownSetting } from '@/components/Admin/AeoCooldownSetting';


export default function MasterLLMsPage() {
  return (
    <>
      <Container size="3" className="max-w-5xl py-8">
        <Flex direction="column" gap="6">
          <Flex direction="column" gap="2">
            <Heading size="6">Master LLMs & API Keys</Heading>
            <Text size="3" color="gray">
              Manage the global AI configurations for the Spectacl platform. API keys are securely injected via environment variables. The Global Models registry dictates which LLMs are available to customers for prompt analysis. Internal Task Models are platform-internal and never advertised to customers.
            </Text>
          </Flex>

          <Section size="1">
              <EnvStatusWidget groups="llm" title="API Keys" description="LLM provider API keys injected via environment variables (.env). Configures Master Keys for MANAGED spaces and all Internal Task Models." />
          </Section>

          <Section size="1">
              <GlobalModelsTable />
          </Section>

          <Section size="1">
              <InternalTaskModelsTable />
          </Section>

          <Section size="1">
              <AeoCooldownSetting />
          </Section>

        </Flex>
      </Container>
    </>
  );
}
