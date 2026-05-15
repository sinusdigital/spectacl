"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";

const Root = React.forwardRef<
    React.ElementRef<typeof ToggleGroupPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, children, ...props }, ref) => (
    <ToggleGroupPrimitive.Root
        ref={ref}
        className={`inline-flex gap-1 ${className}`}
        {...props}
    >
        {children}
    </ToggleGroupPrimitive.Root>
));

Root.displayName = ToggleGroupPrimitive.Root.displayName;

const Item = React.forwardRef<
    React.ElementRef<typeof ToggleGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <ToggleGroupPrimitive.Item
        ref={ref}
        className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all hover:bg-[var(--gray-3)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-9)] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[var(--color-panel-solid)] data-[state=on]:text-[var(--gray-12)] data-[state=on]:shadow-sm ${className}`}
        {...props}
    >
        {children}
    </ToggleGroupPrimitive.Item>
));

Item.displayName = ToggleGroupPrimitive.Item.displayName;

const RadixToggleGroup = {
    Root,
    Item,
};

export default RadixToggleGroup;
