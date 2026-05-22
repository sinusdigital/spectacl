import { Container, Flex, Text, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import PageHeader from "@/components/Shared/PageHeader";
import CronDashboard from "@/components/Admin/CronDashboard";

export default function CronPage() {
  return (
    <Container size="4" p="6">
      <Flex direction="column" gap="8">
        <PageHeader
          title="Cron Jobs"
          description="Monitor scheduled cron runs, prompt scheduling, trial sweeps, and subscription sync."
        />

        <Callout.Root color="gray" variant="surface" size="2">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold">How scheduling works:</Text>{" "}
            An external cron service hits <Text weight="bold">/api/cron</Text> on a fixed interval. Each tick runs four jobs in order: expire stale invitations, expire stale trials, reconcile subscription status with Mollie, and enqueue any prompts that are due. Enqueued prompts are pushed into the BullMQ queue, where background workers (see <Text weight="bold">Workers</Text> page) pick them up and run the actual LLM calls. In short — cron decides <Text style={{ fontStyle: "italic" }}>what</Text> to run, workers do the <Text style={{ fontStyle: "italic" }}>work</Text>.
          </Callout.Text>
        </Callout.Root>

        <CronDashboard />
      </Flex>
    </Container>
  );
}
