"use client";

import { Table, Box, Flex, Text, Badge, Card } from "@radix-ui/themes";
import { LightningBoltIcon } from "@radix-ui/react-icons";

export interface WorkerInfo {
  id: string;
  addr: string;
  started: string;
  ready: boolean;
  status: string;
  name?: string; // We'll inject the queue name here
}

interface WorkersTableProps {
  workers: WorkerInfo[];
}

export default function WorkersTable({ workers }: WorkersTableProps) {
  return (
    <Card size="1">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Queue</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Address</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Started</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell align="right">Status</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {workers.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={5}>
                <Flex justify="center" py="8">
                  <Text size="2" color="gray">No active workers found.</Text>
                </Flex>
              </Table.Cell>
            </Table.Row>
          ) : (
            workers.map((worker) => (
              <Table.Row key={`${worker.name}-${worker.id}`} style={{ verticalAlign: 'middle' }}>
                <Table.RowHeaderCell>
                  <Text size="1" color="gray" weight="regular" style={{ fontFamily: 'var(--font-mono)' }}>
                    {worker.id}
                  </Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Flex align="center" gap="2">
                    <Box 
                      p="1" 
                      style={{ 
                        backgroundColor: 'var(--gray-3)', 
                        borderRadius: 'var(--radius-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <LightningBoltIcon width="14" height="14" color="var(--gray-11)" />
                    </Box>
                    <Text size="2" weight="bold">{worker.name || 'Unknown Queue'}</Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color="gray">{worker.addr}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="1" color="gray">{worker.started}</Text>
                </Table.Cell>
                <Table.Cell align="right">
                  <Badge color="green" variant="soft" radius="full">
                    Active
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Card>
  );
}
