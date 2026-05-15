"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

const Root = React.forwardRef<
    React.ElementRef<typeof SeparatorPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={`shrink-0 bg-[var(--gray-6)] ${orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"} ${className}`}
        {...props}
    />
));
Root.displayName = SeparatorPrimitive.Root.displayName;

const RadixSeparator = {
    Root,
};

export default RadixSeparator;
