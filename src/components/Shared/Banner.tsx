'use client';

import React from 'react';
import { Callout, IconButton, Flex } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';

interface BannerProps {
  children: React.ReactNode;
  label?: string;
  color?: "green" | "blue" | "gray" | "red" | "amber" | "lime";
  variant?: "surface" | "soft" | "outline";
  size?: "1" | "2" | "3";
  onClose?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

/**
 * A reusable atomic banner component based on Radix UI Callout.
 * Designed to be used for tips, success messages, and other inline notifications.
 */
export default function Banner({
  children,
  label,
  color,
  variant = "surface",
  size = "1",
  onClose,
  className,
  icon
}: BannerProps) {
  return (
    <Callout.Root 
      size={size} 
      variant={variant} 
      color={color} 
      className={className}
    >
      {icon && <Callout.Icon>{icon}</Callout.Icon>}
      <Callout.Text>
        <Flex align="center" gap="3" width="100%">
          <div className="flex-1">
            {label && <strong className="mr-1">{label}:</strong>}
            {children}
          </div>
          
          {onClose && (
            <IconButton 
              variant="ghost" 
              color={color} 
              onClick={onClose}
              aria-label="Dismiss banner"
              size="1"
              highContrast
              className="flex-shrink-0"
              style={{ margin: '-4px' }} // Tucks it in slightly like a pro UI
            >
              <Cross2Icon width={size === "1" ? "12" : "14"} height={size === "1" ? "12" : "14"} />
            </IconButton>
          )}
        </Flex>
      </Callout.Text>
    </Callout.Root>
  );
}
