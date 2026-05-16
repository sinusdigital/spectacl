"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";

const Root = React.forwardRef<
    React.ElementRef<typeof TogglePrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>
>(({ className, ...props }, ref) => (
    <TogglePrimitive.Root
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-[var(--gray-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-9)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--gray-4)] data-[state=on]:text-[var(--gray-12)] ${className}`}
        {...props}
    />
));

Root.displayName = TogglePrimitive.Root.displayName;

const RadixToggle = {
    Root,
};

export default RadixToggle;
