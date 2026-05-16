import React from 'react';
import ModelLogo from "@/components/Shared/ModelLogo";
import { ModelConfig } from "@/types/prompts";

interface TargetModelsSelectorProps {
    modelConfigs: ModelConfig[];
    selectedModelIds: string[];
    onToggleModel: (modelId: string, isActive: boolean) => void | Promise<void>;
    layout?: 'default' | 'compact';
    className?: string;
    disabled?: boolean;
}

export default function TargetModelsSelector({
    modelConfigs,
    selectedModelIds,
    onToggleModel,
    layout = 'default',
    className = '',
    disabled = false
}: TargetModelsSelectorProps) {

    // Helper to determine if we should show tooltips (maybe simplify for compact list view?)
    // For now, keep tooltips as they provide important info about disabled state.

    // Only show active models (enabled, not archived, with API keys)
    const activeModels = modelConfigs.filter(config => config.isEnabled && !config.isArchived && config.hasApiKey);

    return (
        <div className={`flex items-center gap-1 bg-gray-100 rounded-lg p-1 ${className}`}>
            {activeModels.length > 0 ? (
                activeModels.map((config) => {
                    const isActive = selectedModelIds.includes(config.id) || 
                                     (config.modelId && selectedModelIds.includes(config.modelId)) || 
                                     selectedModelIds.includes(config.name);

                    const tooltip = `${config.name} (${isActive ? 'Active' : 'Inactive'})`;

                    return (
                        <button
                            key={config.id}
                            onClick={() => {
                                if (!disabled) {
                                    onToggleModel(config.id, isActive);
                                }
                            }}
                            disabled={disabled}
                            title={tooltip}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0
                                ${isActive
                                    ? 'bg-white shadow-sm cursor-pointer'
                                    : 'text-gray-500 hover:bg-gray-200 cursor-pointer'
                                }`}
                            type="button"
                        >
                            <ModelLogo
                                provider={config.provider}
                                name={config.name}
                                size="sm"
                                grayscale={!isActive}
                            />
                        </button>
                    );
                })
            ) : (
                <span className="text-gray-400 text-xs px-2">No active models</span>
            )}
        </div>
    );
}
