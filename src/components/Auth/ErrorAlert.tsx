import React from 'react';
import { cn } from '@/lib/utils';
import { AuthError } from '@/lib/auth-errors';

export interface ErrorAlertProps {
  error: AuthError | string | null;
  className?: string;
}

/**
 * Displays authentication errors in a styled alert box
 * Supports different error types (error, warning, info)
 */
export default function ErrorAlert({ error, className }: ErrorAlertProps) {
  if (!error) return null;
  
  const errorObj: AuthError = typeof error === 'string' 
    ? { message: error, type: 'error', field: 'general' }
    : error;
  
  const typeStyles = {
    error: 'bg-[var(--red-3)] border-[var(--red-7)] text-[var(--red-11)]',
    warning: 'bg-[var(--yellow-3)] border-[var(--yellow-7)] text-[var(--yellow-11)]',
    info: 'bg-[var(--blue-3)] border-[var(--blue-7)] text-[var(--blue-11)]',
  };
  
  const icons = {
    error: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        typeStyles[errorObj.type],
        className
      )}
      role="alert"
    >
      {icons[errorObj.type]}
      <p className="text-sm font-medium flex-1">
        {errorObj.message}
      </p>
    </div>
  );
}
