import React from 'react';
import { Box } from '@radix-ui/themes';
import CompanyLogo from "@/components/CompanyLogo";
import BaseCard from "@/components/Shared/BaseCard";

interface CompetitorCardProps {
    name: string;
    website?: string | null;
    logoUrl?: string | null;
    className?: string;
    logoClassName?: string;
    badges?: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    linkWebsite?: boolean;
    onClick?: () => void;
}

export default function CompetitorCard({
    name,
    website,
    logoUrl,
    className = "",
    logoClassName = "",
    badges,
    description,
    actions,
    linkWebsite = false,
    onClick,
}: CompetitorCardProps) {
    const displayWebsite = website ? (
        linkWebsite ? (
            <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="competitor-website-link truncate block"
                onClick={(e) => e.stopPropagation()}
            >
                {(() => {
                    try {
                        return new URL(website).hostname;
                    } catch {
                        return website;
                    }
                })()}
            </a>
        ) : (
            <p className="competitor-website-link no-underline truncate block">
                {website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
            </p>
        )
    ) : (
        linkWebsite ? <p className="competitor-website-link">No website</p> : null
    );

    const isUntracked = className.includes('bg-gray-50');

    return (
        <BaseCard
            variant={isUntracked ? 'inactive' : 'active'}
            className={className.replace('bg-gray-50', '').replace('opacity-75', '').replace('hover:opacity-100', '').trim()}
            onClick={onClick}
        >
            <BaseCard.Header
                title={name}
                subtitle={displayWebsite}
                badges={badges}
                logo={
                    <CompanyLogo
                        name={name}
                        domain={website || ""}
                        logoUrl={logoUrl}
                        size={48}
                    />
                }
                titleClassName="text-[var(--gray-12)] font-bold"
                logoClassName={logoClassName}
                inactive={isUntracked}
            />
            {description && (
                <BaseCard.Body>
                    <Box className="text-[var(--gray-11)] text-xs line-clamp-2">
                        {description}
                    </Box>
                </BaseCard.Body>
            )}
            {actions && (
                <BaseCard.Footer onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    {actions}
                </BaseCard.Footer>
            )}
        </BaseCard>
    );
}
