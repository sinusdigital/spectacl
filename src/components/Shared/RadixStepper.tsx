import React from 'react';
import { cn } from "@/lib/utils";

interface RadixStepperProps {
  steps: string[];
  currentStep: number; // 1-indexed
  className?: string;
}

export default function RadixStepper({ steps, currentStep, className }: RadixStepperProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-sm", className)}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <React.Fragment key={step}>
            {/* Step Indicator */}
            <div className={cn(
              "flex items-center gap-2",
              isActive || isCompleted ? "text-[var(--gray-12)]" : "text-[var(--gray-11)]"
            )}>
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isCompleted 
                    ? "bg-[var(--accent-9)] text-white" 
                    : isActive 
                      ? "bg-[var(--gray-12)] text-[var(--gray-1)]" 
                      : "bg-transparent border border-[var(--gray-8)] text-[var(--gray-11)]"
                )}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              <span className={cn(
                "font-medium",
                isActive ? "text-[var(--gray-12)]" : "text-[var(--gray-11)]"
              )}>
                {step}
              </span>
            </div>

            {/* Connector Line (if not last step) */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "h-0.5 w-8 rounded-full",
                  stepNum < currentStep ? "bg-[var(--accent-9)]" : "bg-[var(--gray-6)]"
                )} 
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
