"use client";

import { useState, useEffect, useCallback, ComponentProps } from "react";
import PageHeader from "@/components/Shared/PageHeader";
import { Container, Box, Flex, Table, Badge, Text, Card, IconButton, Tooltip } from "@radix-ui/themes";

type BadgeColor = ComponentProps<typeof Badge>["color"];
import Button from "@/components/Shared/Button";
import { useToast } from "@/components/Shared/RadixToast";
import SectionHeader from "@/components/Shared/SectionHeader";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: BadgeColor; label: string }> = {
  PENDING: { color: "amber", label: "Pending" },
  APPROVED: { color: "green", label: "Approved" },
  REJECTED: { color: "red", label: "Rejected" },
};

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/waitlist");
      const data = await res.json();
      setEntries(data);
    } catch {
      toastError("Failed to load waitlist.");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/waitlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
      success(status === "APPROVED" ? "Entry approved." : "Entry rejected.");
    } catch {
      toastError("Failed to update entry.");
    } finally {
      setUpdating(null);
    }
  };

  const pending = entries.filter(e => e.status === "PENDING");
  const reviewed = entries.filter(e => e.status !== "PENDING");

  return (
    <Container size="4" p="6">
      <Flex direction="column" gap="9">
        <PageHeader
          title="Waitlist"
          description="Review and approve signup requests."
        />

        {/* Pending */}
        <Box>
          <Box mb="4">
            <SectionHeader
              title={`Pending Review (${pending.length})`}
              description="These users are waiting for your approval."
            />
          </Box>
          {loading ? (
            <Flex justify="center" py="8">
              <Text size="2" color="gray">Loading...</Text>
            </Flex>
          ) : pending.length === 0 ? (
            <Box py="8" style={{ textAlign: 'center', border: '1px dashed var(--gray-6)', borderRadius: 'var(--radius-4)' }}>
              <Text size="2" color="gray">No pending requests 🎉</Text>
            </Box>
          ) : (
            <Card size="1">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Message</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Submitted</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell align="right"></Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pending.map(entry => (
                    <Table.Row key={entry.id} style={{ verticalAlign: 'middle' }}>
                      <Table.RowHeaderCell>
                        <Text size="2" weight="bold">{entry.name}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2">
                          <a href={`mailto:${entry.email}`} style={{ color: 'var(--blue-11)', textDecoration: 'underline' }}>{entry.email}</a>
                        </Text>
                      </Table.Cell>
                      <Table.Cell style={{ maxWidth: '250px' }}>
                        <Text size="2" color="gray" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                          {entry.message || <Text size="1" color="gray" weight="regular" style={{ fontStyle: 'italic' }}>—</Text>}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" color="gray">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell align="right">
                        <Flex gap="2" justify="end">
                          <Button
                            variant="secondary"
                            onClick={() => updateStatus(entry.id, "REJECTED")}
                            disabled={updating === entry.id}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => updateStatus(entry.id, "APPROVED")}
                            disabled={updating === entry.id}
                            isLoading={updating === entry.id}
                            loadingText="Approving…"
                          >
                            Approve
                          </Button>
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>
          )}
        </Box>

        {/* Approved / Rejected — shows email for manual outreach */}
        {reviewed.length > 0 && (
          <Box>
            <Box mb="4">
              <SectionHeader
                title="Reviewed"
                description="Approved entries — email these users their invite. Rejected entries can be re-approved."
              />
            </Box>
            <Card size="1">
              <Table.Root variant="surface">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Submitted</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell align="right"></Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {reviewed.map(entry => (
                    <Table.Row key={entry.id} style={{ verticalAlign: 'middle' }}>
                      <Table.RowHeaderCell>
                        <Text size="2" weight="bold">{entry.name}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2">
                          <a href={`mailto:${entry.email}`} style={{ color: 'var(--blue-11)', textDecoration: 'underline' }}>{entry.email}</a>
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={STATUS_CONFIG[entry.status].color} variant="soft" radius="full">
                          {STATUS_CONFIG[entry.status].label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="1" color="gray">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </Text>
                      </Table.Cell>
                      <Table.Cell align="right">
                        {entry.status === "REJECTED" && (
                          <Button variant="secondary" onClick={() => updateStatus(entry.id, "APPROVED")} disabled={updating === entry.id}>
                            Re-approve
                          </Button>
                        )}
                        {entry.status === "APPROVED" && (
                          <Button variant="secondary" onClick={() => updateStatus(entry.id, "REJECTED")} disabled={updating === entry.id}>
                            Revoke
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Card>
          </Box>
        )}
      </Flex>
    </Container>
  );
}
