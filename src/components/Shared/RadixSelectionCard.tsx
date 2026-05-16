
import React from 'react';
import { cn } from "@/lib/utils";

interface RadixSelectionCardProps {
  title: string;
  description?: string;
  value: string;
  selectedValue: string;
  onChange: (value: string) => void;
  name: string;
  className?: string;
}

export default function RadixSelectionCard({
  title,
  description,
  value,
  selectedValue,
  onChange,
  name,
  className
}: RadixSelectionCardProps) {
  const isSelected = value === selectedValue;

  return (
    <label
      className={cn(
        "relative flex cursor-pointer rounded-xl border p-4 transition-all duration-200",
        // Base styles
        "border-[var(--gray-6)] bg-[var(--color-surface)] hover:border-[var(--gray-8)] hover:bg-[var(--gray-a2)]",
        // Selected styles
        isSelected && "border-[var(--accent-9)] bg-[var(--accent-2)] ring-1 ring-[var(--accent-9)]",
        className
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-[var(--gray-12)]">{title}</div>
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
              isSelected
                ? "border-[var(--accent-9)] bg-[var(--accent-9)]"
                : "border-[var(--gray-8)] bg-transparent"
            )}
          >
            {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
          </div>
        </div>
        {description && (
          <p className="text-sm text-[var(--gray-11)] leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </label>
  );
}
