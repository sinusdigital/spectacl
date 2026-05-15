import React from 'react';
import { ModelConfig } from '@/types/models';
import BaseCard from "@/components/Shared/BaseCard";
import Button from "@/components/Shared/Button";
import ModelLogo from '@/components/Shared/ModelLogo';

interface ModelCardProps {
    model: ModelConfig;
    onClick: () => void;
    onToggleStatus?: (model: ModelConfig, newStatus: boolean) => void;
    onArchive: (model: ModelConfig) => void;
    onDelete?: (model: ModelConfig) => void;
    onUnarchive?: (model: ModelConfig) => void;
}


export default function ModelCard({
    model,
    onClick,
    onArchive,
    onDelete,
    onUnarchive
}: ModelCardProps) {
    const isArchived = model.isArchived;

    return (
        <BaseCard
            variant={isArchived ? 'inactive' : 'active'}
        >
            <BaseCard.Header
                title={model.name}
                subtitle={
                    <p className="competitor-website-link capitalize">
                        {model.provider}
                    </p>
                }
                logo={
                    <ModelLogo
                        provider={model.provider}
                        name={model.name}
                        size="lg"
                        grayscale={isArchived}
                    />
                }
                logoClassName="competitor-logo w-12 h-12 flex items-center justify-center bg-white rounded-xl border border-gray-100"
                headerExtra={
                    <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">API KEY</span>
                        {model.hasApiKey ? (
                            <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 font-medium w-fit uppercase tracking-wider">
                                CONFIGURED
                            </span>
                        ) : (
                            <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-100 font-medium w-fit uppercase tracking-wider">
                                MISSING
                            </span>
                        )}
                    </div>
                }
                inactive={isArchived}
            />

            <BaseCard.Footer>
                {isArchived ? (
                    <>
                        <Button
                            variant="ghost-danger"
                            size="xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(model);
                            }}
                        >
                            Delete
                        </Button>
                        <Button
                            variant="tertiary"
                            size="xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnarchive?.(model);
                            }}
                        >
                            Activate
                        </Button>
                    </>
                ) : (
                    <>
                        {model.hasApiKey && (
                            <Button
                                variant="tertiary"
                                size="xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onArchive(model);
                                }}
                            >
                                Deactivate
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            size="xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                        >
                            Configure
                        </Button>
                    </>
                )}
            </BaseCard.Footer>
        </BaseCard>
    );
}
