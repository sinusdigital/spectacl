'use client';

import { useEffect, useState } from 'react';
import { Card, Flex, Text, Badge, Skeleton, Heading } from '@radix-ui/themes';

interface EnvVar {
  set: boolean;
  description: string;
}

type EnvData = Record<string, Record<string, EnvVar>>;

interface EnvStatusWidgetProps {
  /** Which group(s) of env vars to show. Single group or array. */
  groups: string | string[];
  /** Card title. */
  title?: string;
  /** Description text below title. */
  description?: string;
}

export function EnvStatusWidget({
  groups,
  title = 'Environment Variables',
  description,
}: EnvStatusWidgetProps) {
  const [data, setData] = useState<EnvData | null>(null);
  const [loading, setLoading] = useState(true);

  const groupList = Array.isArray(groups) ? groups : [groups];

  useEffect(() => {
    fetch('/api/admin/env-status')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setData)
      .catch(() => console.error('Failed to fetch env status'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3">
          <Heading size="3">{title}</Heading>
          {description && <Text size="2" color="gray">{description}</Text>}
          {[1, 2, 3].map(i => (
            <Flex key={i} align="center" justify="between" p="3" style={{ border: '1px solid var(--gray-a5)', borderRadius: 'var(--radius-2)' }}>
              <Skeleton width="120px" height="16px" />
              <Skeleton width="40px" height="20px" />
            </Flex>
          ))}
        </Flex>
      </Card>
    );
  }

  if (!data) return null;

  // Collect vars from all requested groups
  const vars: [string, EnvVar][] = [];
  for (const g of groupList) {
    if (data[g]) vars.push(...Object.entries(data[g]));
  }

  if (vars.length === 0) return null;

  const allSet = vars.every(([, v]) => v.set);
  const missingCount = vars.filter(([, v]) => !v.set).length;

  return (
    <Card size="2">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center">
          <Heading size="3">{title}</Heading>
          {allSet ? (
            <Badge color="green" variant="soft" size="1">All set</Badge>
          ) : (
            <Badge color="red" variant="soft" size="1">{missingCount} missing</Badge>
          )}
        </Flex>
        {description && <Text size="2" color="gray">{description}</Text>}
        <Flex direction="column" gap="1">
          {vars.map(([key, v]) => (
            <Flex
              key={key}
              align="center"
              justify="between"
              gap="3"
              px="3" py="2"
              style={{
                border: '1px solid var(--gray-a5)',
                borderRadius: 'var(--radius-2)',
                backgroundColor: v.set ? undefined : 'var(--red-a2)',
              }}
            >
              <Flex direction="column" gap="0" style={{ minWidth: 0, flex: 1 }}>
                <Text size="2" weight="bold" style={{ fontFamily: 'var(--font-mono)' }}>
                  {key}
                </Text>
                <Text size="1" color="gray" truncate>{v.description}</Text>
              </Flex>
              <Badge color={v.set ? 'green' : 'red'} variant="soft" size="1" style={{ flexShrink: 0 }}>
                {v.set ? 'Set' : 'Missing'}
              </Badge>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
