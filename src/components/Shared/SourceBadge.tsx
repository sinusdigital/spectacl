import React from 'react';
import EntityBadge from './EntityBadge';

interface SourceBadgeProps {
    url: string;
    entityName?: string;
    logoUrl?: string | null;
    className?: string;
    clickable?: boolean;
}

export default function SourceBadge({
    url,
    entityName,
    logoUrl,
    className = '',
    clickable = true
}: SourceBadgeProps) {
    // Extract domain for logo lookup and display path for label
    const displayDomain = url
        .replace(/^https?:\/\/(www\.)?/, '')
        .replace(/\/$/, '');

    // Extract just the hostname for CompanyLogo favicon lookup
    let hostname: string | null = null;
    try {
        hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    } catch {
        // Invalid URL — no logo
    }

    // Check if it's the primary entity's own source
    const isOwn = entityName && url.toLowerCase().includes(entityName.toLowerCase());

    const content = (
        <EntityBadge
            name={displayDomain}
            logoUrl={logoUrl}
            website={hostname}
            variant={isOwn ? 'primary' : 'default'}
            className={`${className} ${clickable ? 'cursor-pointer' : ''} transition-opacity hover:opacity-80`}
        />
    );

    if (clickable) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex no-underline"
                title={url}
            >
                {content}
            </a>
        );
    }

    return content;
}
