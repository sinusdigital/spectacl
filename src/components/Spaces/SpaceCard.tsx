import React from 'react';
import BaseCard from '@/components/Shared/BaseCard';
import FadeOutList from '@/components/Shared/FadeOutList';
import { SpaceIcon } from '@/components/Shared/SpaceIcon';
import { Flex, Box, Text, Badge } from '@radix-ui/themes';
import { cn } from "@/lib/utils";
import PlanBadge from '@/components/Shared/PlanBadge';
import CompanyLogo from '@/components/CompanyLogo';

interface SpaceCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

interface HeaderProps {
    title: string;
    plan: string;
    role?: string;
    inviterName?: string;
    joinedDate?: string;
}

interface StatsProps {
    members: number;
    memberLimit?: number;
    entities: number;
    entityLimit?: number;
    prompts: number;
    promptLimit: number;
}

interface EntitiesListProps {
    entities: {
        id: string;
        name: string;
        website?: string | null;
        logoUrl: string | null;
        isArchived: boolean;
    }[];
}

interface FooterProps {
    children?: React.ReactNode;
}

/**
 * Enhanced SpaceCard using the standardized BaseCard (Radix Card primitive).
 */
export default function SpaceCard({ children, className = "", onClick }: SpaceCardProps) {
    return (
        <BaseCard onClick={onClick} className={className}>
            <Flex direction="column" gap="4">
                {children}
            </Flex>
        </BaseCard>
    );
}

const ROLE_BADGE_COLOR: Record<string, 'red' | 'blue' | 'gray'> = {
    OWNER: 'red',
    ADMIN: 'blue',
    MEMBER: 'gray',
};

function Header({ title, plan, role, inviterName, joinedDate }: HeaderProps) {
    return (
        <Flex justify="between" align="start" gap="4">
            <Flex align="center" gap="4">
                <SpaceIcon size="lg" />
                <Box>
                    <Text as="div" size="4" weight="bold" className="text-[var(--gray-12)] leading-tight">{title}</Text>
                    <Flex gap="2" mt="1" wrap="wrap" align="center">
                        {role && (
                            <Badge color={ROLE_BADGE_COLOR[role] ?? 'gray'} variant="soft" size="1">
                                {role}
                            </Badge>
                        )}
                        {inviterName && (
                            <Text size="1" color="gray">
                                Invited by {inviterName}
                            </Text>
                        )}
                    </Flex>
                </Box>
            </Flex>

            <Flex direction="column" align="end" gap="2">
                <Box className="text-right">
                    <Text as="div" size="1" weight="medium" color="gray" className="uppercase tracking-wider mb-1">PLAN</Text>
                    <PlanBadge plan={plan} />
                </Box>
                {joinedDate && (
                    <Text size="1" color="gray" className="whitespace-nowrap">
                        Joined {joinedDate}
                    </Text>
                )}
            </Flex>
        </Flex>
    );
}

function Stats({ members, memberLimit, entities, entityLimit, prompts, promptLimit }: StatsProps) {
    return (
        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-[var(--gray-4)]">
            <div>
                <Text as="div" size="1" weight="medium" color="gray" className="uppercase tracking-wider mb-1">MEMBERS</Text>
                <Text size="6" weight="bold" className="text-[var(--gray-12)] whitespace-nowrap">
                    {members}
                    {memberLimit !== undefined && (
                        <Text color="gray" size="4" weight="regular">
                             /{memberLimit === -1 ? '∞' : memberLimit}
                        </Text>
                    )}
                </Text>
            </div>
            <div>
                <Text as="div" size="1" weight="medium" color="gray" className="uppercase tracking-wider mb-1">ENTITIES</Text>
                <Text size="6" weight="bold" className="text-[var(--gray-12)] whitespace-nowrap">
                    {entities}
                    {entityLimit !== undefined && (
                        <Text color="gray" size="4" weight="regular">
                            /{entityLimit === -1 ? '∞' : entityLimit}
                        </Text>
                    )}
                </Text>
            </div>
            <div>
                <Text as="div" size="1" weight="medium" color="gray" className="uppercase tracking-wider mb-1">PROMPTS</Text>
                <Text size="6" weight="bold" className="text-[var(--gray-12)] whitespace-nowrap">
                    {prompts}<Text color="gray" size="4" weight="regular">/{promptLimit === -1 ? '∞' : promptLimit}</Text>
                </Text>
            </div>
        </div>
    );
}

function EntitiesList({ entities }: EntitiesListProps) {
    return (
        <Box className="space-y-2 min-h-[58px]">
            <Text as="div" size="1" weight="medium" color="gray" className="uppercase tracking-wider mb-1">
                Entities
            </Text>
            {entities.length > 0 ? (
                <FadeOutList>
                    {entities.map((entity) => (
                        <Flex
                            key={entity.id}
                            align="center"
                            gap="2"
                            px="3"
                            py="2"
                            className={cn(
                                "grow-0 flex-shrink-0 rounded-lg border transition-colors",
                                entity.isArchived 
                                ? 'bg-[var(--gray-3)] border-[var(--gray-5)] opacity-60' 
                                : 'bg-[var(--color-surface)] border-[var(--gray-4)]'
                            )}
                        >
                            <CompanyLogo
                                domain={entity.website}
                                name={entity.name}
                                logoUrl={entity.logoUrl}
                                size={16}
                                radius="small"
                            />
                            <Text size="2" weight="medium" className={entity.isArchived ? 'text-[var(--gray-11)]' : 'text-[var(--gray-12)]'}>
                                {entity.name}
                            </Text>
                        </Flex>
                    ))}
                </FadeOutList>
            ) : (
                <Flex align="center" className="h-[42px]">
                    <Text size="2" color="gray" className="italic opacity-60">no entities yet</Text>
                </Flex>
            )}
        </Box>
    );
}

function Footer({ children }: FooterProps) {
    return (
        <BaseCard.Footer className="border-t border-[var(--gray-4)] pt-[var(--space-6)]">
            {children}
        </BaseCard.Footer>
    );
}

SpaceCard.Header = Header;
SpaceCard.Stats = Stats;
SpaceCard.EntitiesList = EntitiesList;
SpaceCard.Footer = Footer;
