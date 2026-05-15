import { Container, Flex, Text, Callout } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import PageHeader from "@/components/Shared/PageHeader";
import WorkersTable, { WorkerInfo } from "@/components/Admin/WorkersTable";
import QueueDashboard from "@/components/Admin/QueueDashboard";
import { analysisQueue } from "@/lib/queue/analysisQueue";
import { creditResetQueue } from "@/lib/queue/creditResetQueue";
import { Queue } from "bullmq";

async function getQueueWorkers(queue: Queue, queueName: string): Promise<WorkerInfo[]> {
  try {
    const workers = await queue.getWorkers();
    return workers.map((w: Record<string, unknown>) => ({
      id: String(w.id || 'unknown'),
      addr: String(w.addr || 'unknown'),
      started: w.age ? new Date(Date.now() - (Number(w.age) * 1000)).toLocaleString() : 'unknown',
      ready: true,
      status: 'Active',
      name: queueName,
    }));
  } catch (error) {
    console.error(`Failed to fetch workers for ${queueName}:`, error);
    return [];
  }
}

export default async function WorkersPage() {
  const [analysisWorkers, creditResetWorkers] = await Promise.all([
    getQueueWorkers(analysisQueue, "Analysis Queue"),
    getQueueWorkers(creditResetQueue, "Credit Reset Queue"),
  ]);

  const allWorkers = [...analysisWorkers, ...creditResetWorkers];

  return (
    <Container size="4" p="6">
      <Flex direction="column" gap="8">
        <PageHeader
          title="Background Workers"
          description="Monitor workers, queue depth, and job processing times in real time."
        />

        <Callout.Root color="gray" variant="surface" size="2">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold">How processing works:</Text>{" "}
            Workers are long-running BullMQ processes that pull jobs from the Redis queue and execute them. Each job makes LLM API calls (OpenAI, Anthropic, Google), parses the response, and stores analysis results. Workers run with per-provider rate limiting to stay within API quotas. The queue is fed by the cron scheduler (see <Text weight="bold">Cron Jobs</Text> page) which decides which prompts are due, and by user-initiated actions like rescans.
          </Callout.Text>
        </Callout.Root>

        <QueueDashboard />

        <WorkersTable workers={allWorkers} />
      </Flex>
    </Container>
  );
}
