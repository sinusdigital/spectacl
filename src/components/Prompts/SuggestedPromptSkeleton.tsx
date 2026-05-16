import React from 'react';

const SkeletonPulse = () => (
    <div className="animate-pulse flex flex-col h-full justify-between">
        <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="flex gap-2 mt-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
    </div>
);

export default function SuggestedPromptSkeleton() {
    return (
        <div className="h-full min-w-[320px] max-w-[320px] flex-shrink-0 snap-start bg-[var(--color-panel-solid)] rounded-xl border border-[var(--gray-4)] p-5">
            <div className="flex flex-col h-full">
                {/* Header/Title Area */}
                <div className="mb-4">
                     <div className="h-5 bg-blue-50 rounded-md w-1/3 mb-4 animate-pulse"></div>
                     <SkeletonPulse />
                </div>
                 
                 {/* Center Content - "Awaiting Prompts" */}
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-xl z-10">
                    <div className="flex flex-col items-center gap-3">
                         <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                         <span className="text-sm font-medium text-blue-600 animate-pulse">Awaiting prompts...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
