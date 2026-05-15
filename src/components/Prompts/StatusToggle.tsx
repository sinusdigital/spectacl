import React from 'react';

interface StatusToggleProps {
    status: 'Running' | 'Paused' | string;
    onStatusChange: (status: 'Running' | 'Paused') => void | Promise<void>;
    layout?: 'default' | 'compact';
    className?: string;
    disabled?: boolean;
}

export default function StatusToggle({
    status,
    onStatusChange,
    layout = 'default',
    className = '',
    disabled = false
}: StatusToggleProps) {
    const isRunning = status === 'Running';
    const isPaused = status === 'Paused';
    const isCompact = layout === 'compact';

    // Button sizing based on layout
    const buttonClasses = isCompact
        ? 'w-8 h-8 flex items-center justify-center p-0'
        : 'p-2';

    // Icon size - match standard uniform look
    const iconSize = 'w-4 h-4';

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${!isCompact ? 'pr-3' : ''}`}>
                <div className="flex items-center">
                    <button
                        onClick={() => onStatusChange('Running')}
                        disabled={disabled || isRunning}
                        className={`${buttonClasses} rounded-md transition-all ${isRunning
                            ? 'bg-white text-green-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        title="Active"
                        type="button"
                    >
                        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onStatusChange('Paused')}
                        disabled={disabled || isPaused}
                        className={`${buttonClasses} rounded-md transition-all ${isPaused
                            ? 'bg-white text-yellow-600 shadow-sm'
                            : 'text-gray-400 hover:text-gray-600'
                            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        title="Inactive"
                        type="button"
                    >
                        <svg className={`${iconSize} fill-current`} viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    </button>
                </div>
                {!isCompact && (
                    <span className={`text-xs font-semibold uppercase tracking-wide inline-block w-16 text-center ${isRunning ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                        {isRunning ? 'Active' : (isPaused ? 'Inactive' : status)}
                    </span>
                )}
            </div>
        </div>
    );
}
