

import { Flex, Text, Box } from '@radix-ui/themes';
import { cn } from "@/lib/utils";
import BaseCard from './BaseCard';
import MetricTriplet from './MetricTriplet';

interface EntityCardProps {
    title: string;
    subtitle?: React.ReactNode;
    badges?: React.ReactNode;
    logo?: React.ReactNode;
    metrics?: React.ReactNode;
    status?: React.ReactNode;
    headerExtra?: React.ReactNode;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    variant?: 'active' | 'inactive';
    className?: string;
    logoClassName?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    onClick?: () => void;
    badgesPosition?: 'above' | 'below';
    titlePosition?: 'header' | 'body';
    style?: React.CSSProperties;
}

export default function EntityCard({
    title,
    subtitle,
    badges,
    logo,
    metrics,
    status,
    headerExtra,
    actions,
    children,
    variant = 'active',
    className = "",
    logoClassName = "flex-shrink-0 flex items-center justify-center",
    titleClassName = "",
    descriptionClassName = "line-clamp-2",
    onClick,
    badgesPosition = 'below',
    titlePosition = 'header',
    style,
}: EntityCardProps) {
    const isInactive = variant === 'inactive';

    const renderBadges = () => badges && (
        <div className={`flex flex-col gap-0.5 ${badgesPosition === 'above' ? 'mb-1' : 'mt-1'}`}>
            {badges}
        </div>
    );

    const m = (typeof metrics === 'object' && metrics !== null) ? (metrics as unknown as Record<string, string | number | boolean | undefined | null>) : {};
    const mentionRate = m.mentionRate as number | null | undefined;
    const avgPosition = m.avgPosition as number | null | undefined;
    const shareOfVoice = m.shareOfVoice as number | null | undefined;
    const totalCompetitors = m.totalCompetitors as number | undefined;
    const isAnalyzing = (m.isAnalyzing as boolean | undefined) ?? false;
    
    // Safety check for boolean mentioned value
    const mentionedValue = typeof m.mentioned === 'boolean' ? m.mentioned : 
                          typeof m.mentioned === 'number' ? m.mentioned > 0 : 
                          undefined;

    return (
        <BaseCard 
            variant={variant} 
            className={className} 
            onClick={onClick}
            style={style}
        >
            <BaseCard.Header
                title={title}
                subtitle={subtitle}
                logo={logo}
                badges={badges}
                badgesPosition={badgesPosition}
                headerExtra={headerExtra}
                titleClassName={titleClassName}
                logoClassName={logoClassName}
                inactive={isInactive}
            />

            <BaseCard.Body>
                {/* Legacy support for body titles */ }
                {titlePosition === 'body' && (
                    <Box mb="4">
                        {badgesPosition === 'above' && renderBadges()}
                        <Text as="div" size="4" weight="bold" className={cn("text-[var(--gray-12)]", titleClassName)}>
                            {title}
                        </Text>
                        {subtitle && (
                            <Text as="div" size="2" color="gray" mt="1">
                                {subtitle}
                            </Text>
                        )}
                        {badgesPosition === 'below' && renderBadges()}
                    </Box>
                )}
                
                {children && (
                    <Box className={descriptionClassName}>
                        {children}
                    </Box>
                )}

                {(metrics || status) && (
                    <Flex gap="4" mt="auto" pt="4" align="center" justify="between">
                        {metrics && (
                            <Box className="flex-1">
                                {typeof metrics === 'object' && metrics !== null && ('mentionRate' in metrics || 'avgPosition' in metrics || 'shareOfVoice' in metrics) ? (
                                    <MetricTriplet 
                                        mentionRate={mentionRate}
                                        mentioned={mentionedValue}
                                        avgPosition={avgPosition}
                                        shareOfVoice={shareOfVoice}
                                        totalCompetitors={totalCompetitors}
                                        isAnalyzing={isAnalyzing}
                                        showIndicators={true}
                                        variant="compact"
                                    />
                                ) : (
                                    metrics
                                )}
                            </Box>
                        )}
                        {status && <Box>{status}</Box>}
                    </Flex>
                )}
            </BaseCard.Body>

            {actions && (
                <BaseCard.Footer className="items-stretch">
                    {actions}
                </BaseCard.Footer>
            )}
        </BaseCard>
    );
}

EntityCard.Metrics = MetricTriplet;
