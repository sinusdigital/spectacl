import React from 'react';
import RadixInput from '@/components/Shared/RadixInput';
import RadixLabel from '@/components/Shared/RadixLabel';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

/**
 * Reusable form field component with label, input, and error display
 * Uses Radix components for consistency
 */
export default function FormField({ 
  label, 
  error, 
  helperText,
  id,
  className,
  ...inputProps 
}: FormFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={cn("space-y-2", className)}>
      <RadixLabel htmlFor={fieldId}>
        {label}
      </RadixLabel>
      
      <RadixInput
        id={fieldId}
        error={!!error}
        {...inputProps}
      />
      
      {error && (
        <p className="text-sm text-[var(--red-11)] flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
      
      {!error && helperText && (
        <p className="text-sm text-[var(--gray-11)]">
          {helperText}
        </p>
      )}
    </div>
  );
}
