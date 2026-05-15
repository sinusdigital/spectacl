"use client";

import { ReactNode } from "react";
import { Card, Heading, Flex, Box } from "@radix-ui/themes";
import { cn } from "@/lib/utils";

interface RadixCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  footer?: ReactNode;
}

export default function RadixCard({ title, children, className = "", action, footer }: RadixCardProps) {
  return (
    <Card size="2" className={cn("flex flex-col", className)}>
        {(title || action) && (
            <Flex align="center" justify="between" mb="4">
                {title && <Heading as="h3" size="3" weight="bold">{title}</Heading>}
                {action && <Box>{action}</Box>}
            </Flex>
        )}
      <Box className="flex-1" style={{ fontSize: 'var(--font-size-2)', color: 'var(--gray-11)' }}>{children}</Box>
      {footer && (
        <div className="mt-4 pt-4 border-t border-[var(--gray-4)] grid grid-flow-col auto-cols-fr gap-3 w-full">
          {footer}
        </div>
      )}
    </Card>
  );
}
