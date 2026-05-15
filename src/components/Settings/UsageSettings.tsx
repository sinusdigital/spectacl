"use client";

import { useState, useEffect } from 'react';
import { Card, Flex, Box, Text, Heading, Badge, Progress, Grid, Button } from "@radix-ui/themes";
import { SpacePlan } from "@prisma/client";
import UpgradeRequiredModal from "@/components/Shared/UpgradeRequiredModal";

type LLMTrack = "MANAGED" | "BYOK";

export interface SpaceInfo {
    id:          string;
    name:        string;
    plan:        SpacePlan;
    llmProvider: LLMTrack;
}

interface UsageSettingsProps {
    space: SpaceInfo | null;
}

interface UsageStats {
  members: {
    current: number;
    limit: number;
  };
  entities: {
    current: number;
    limit: number;
  };
  prompts: {
    current: number;
    limit: number;
  };
  monthlyAnalyses: {
    current: number;
    limit: number;
  };
}

export default function UsageSettings({ space }: UsageSettingsProps) {
    const [usage, setUsage]             = useState<UsageStats | null>(null);
    const [loading, setLoading]         = useState(true);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/spaces/current/usage');
      if (!res.ok) throw new Error('Failed to fetch usage');
      const data = await res.json();
      
      // Map API response to component state
      const mappedUsage: UsageStats = {
        members: {
          current: data.current.members || 0,
          limit: data.limits.maxMembers === -1 ? Infinity : data.limits.maxMembers,
        },
        entities: {
          current: data.current.entities || 0,
          limit: data.limits.maxEntities === -1 ? Infinity : data.limits.maxEntities,
        },
        prompts: {
          current: data.current.activePrompts || 0,
          limit: data.limits.maxActivePrompts === -1 ? Infinity : data.limits.maxActivePrompts,
        },
        monthlyAnalyses: {
          current: data.current.prompts || 0, // Using prompts as a proxy for total analyses for now
          limit: data.limits.monthlyCreditLimit ?? 0, // Dynamic credit limit from calculateMonthlyCreditsFromDb
        },
      };
      
      setUsage(mappedUsage);
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" p="9">
        <Text color="gray">Loading usage data...</Text>
      </Flex>
    );
  }

  if (!usage) return null;

  const usageCards = [
    {
      title: 'Team Members',
      current: usage.members.current,
      limit: usage.members.limit,
      description: 'Active users in this space'
    },
    {
      title: 'Entities',
      current: usage.entities.current,
      limit: usage.entities.limit,
      description: 'Brands or companies being tracked'
    },
    {
      title: 'Active Prompts',
      current: usage.prompts.current,
      limit: usage.prompts.limit,
      description: 'Questions being asked to LLMs'
    },
    {
      title: 'Monthly Analyses',
      current: usage.monthlyAnalyses.current,
      limit: usage.monthlyAnalyses.limit,
      description: 'Analyses performed this billing period'
    }
  ];

  return (
    <Flex direction="column" gap="6">
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        {usageCards.map((card) => {
          const percentage = Math.min(Math.round((card.current / card.limit) * 100), 100);
          const isNearLimit = percentage >= 80;
          const isAtLimit = percentage >= 100;

          return (
            <Card key={card.title} size="3">
              <Flex direction="column" gap="3">
                <Flex align="center" justify="between">
                  <Box>
                    <Heading size="3">{card.title}</Heading>
                    <Text size="1" color="gray">{card.description}</Text>
                  </Box>
                  <Badge color={isAtLimit ? 'red' : isNearLimit ? 'amber' : 'blue'} variant="soft">
                    {card.current} / {card.limit === Infinity ? '∞' : card.limit}
                  </Badge>
                </Flex>

                <Box pt="2">
                  <Flex justify="between" mb="1">
                    <Text size="1" color="gray">Usage</Text>
                    <Text size="1" weight="bold">{percentage}%</Text>
                  </Flex>
                  <Box style={{ width: '100%' }}>
                    <Progress 
                      value={percentage} 
                      size="2" 
                      color={isAtLimit ? 'red' : isNearLimit ? 'amber' : 'blue'} 
                    />
                  </Box>
                </Box>
              </Flex>
            </Card>
          );
        })}
      </Grid>

      <Card size="2" variant="surface">
        <Flex direction="column" gap="2">
          <Heading size="3">Need more capacity?</Heading>
          <Text size="2" color="gray">
            If you&apos;re reaching your limits, consider upgrading your plan for higher quotas and additional features.
          </Text>
            <Box mt="2">
                <Button variant="solid" onClick={() => setIsUpgradeModalOpen(true)}>
                    View Upgrade Options
                </Button>
            </Box>
        </Flex>
      </Card>

      <UpgradeRequiredModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        limit={null}
        resourceName="capacity"
        spaceId={space?.id}
        currentPlan={space?.plan}
        llmProvider={space?.llmProvider}
      />
    </Flex>
  );
}
