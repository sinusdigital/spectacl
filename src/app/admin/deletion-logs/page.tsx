'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Flex, Box, Card, Table, Text, Badge } from '@radix-ui/themes';
import PageHeader from '@/components/Shared/PageHeader';
import SectionHeader from '@/components/Shared/SectionHeader';

interface DeletionLog {
  id: string;
  spaceId: string;
  spaceName: string;
  plan: string;
  reason: string | null;
  source: string;
  deletedAt: string;
}

const PLAN_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'crimson'> = {
  FOUNDER: 'crimson',
  STARTER: 'blue',
  PRO: 'green',
  BUSINESS: 'orange',
  ENTERPRISE: 'purple',
};

export default function DeletionLogsPage() {
  const [logs, setLogs] = useState<DeletionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/deletion-logs');
      const data = await res.json();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Container size="4" p="6">
      <Flex direction="column" gap="9">
        <PageHeader
          title="Deletion Logs"
          description="Spaces that have been deleted and the reason provided at offboarding."
        />

        <Box>
          <Box mb="4">
            <SectionHeader
              title={`${logs.length} deleted space${logs.length !== 1 ? 's' : ''}`}
              description="Most recent first."
            />
          </Box>

          {loading ? (
            <Flex justify="center" py="8">
              <Text size="2" color="gray">Loading…</Text>
            </Flex>
          ) : logs.length === 0 ? (
            <Box
              py="8"
              style={{
                textAlign: 'center',
                border: '1px dashed var(--gray-6)',
                borderRadius: 'var(--radius-4)',
              }}
            >
              <Text size="2" color="gray">No deletions yet.</Text>
            </Box>
          ) : (
            <Card size="1">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Space</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Source</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Reason</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {logs.map(log => (
                    <Table.Row key={log.id} style={{ verticalAlign: 'middle' }}>
                      <Table.RowHeaderCell>
                        <Flex direction="column" gap="1">
                          <Text size="2" weight="bold">{log.spaceName}</Text>
                          <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
                            {log.spaceId}
                          </Text>
                        </Flex>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Badge
                          color={PLAN_COLORS[log.plan] ?? 'gray'}
                          variant="soft"
                          radius="full"
                        >
                          {log.plan}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          color={log.source === 'cancellation' ? 'orange' : 'red'}
                          variant="soft"
                          radius="full"
                        >
                          {log.source === 'cancellation' ? 'Cancelled' : 'Deleted'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell style={{ maxWidth: 320 }}>
                        {log.reason ? (
                          <Text size="2">{log.reason}</Text>
                        ) : (
                          <Text size="2" color="gray" style={{ fontStyle: 'italic' }}>—</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" color="gray">
                          {new Date(log.deletedAt).toLocaleString()}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>
          )}
        </Box>
      </Flex>
    </Container>
  );
}
