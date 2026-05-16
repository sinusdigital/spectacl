"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

const Root = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={`relative h-2 w-full overflow-hidden rounded-full bg-[var(--gray-4)] ${className}`}
        {...props}
    >
        <ProgressPrimitive.Indicator
            className="h-full w-full flex-1 bg-[var(--accent-9)] transition-all"
            style={{ transform: `translateX(-${100 - (props.value || 0)}%)` }}
        />
    </ProgressPrimitive.Root>
));
Root.displayName = ProgressPrimitive.Root.displayName;

const RadixProgress = {
    Root,
};

export default RadixProgress;
