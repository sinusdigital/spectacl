"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

const Root = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
        {...props}
    />
));
Root.displayName = LabelPrimitive.Root.displayName;

const RadixLabel = {
    Root,
};

export default RadixLabel;
