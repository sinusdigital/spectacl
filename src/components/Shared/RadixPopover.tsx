"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";


const Root = PopoverPrimitive.Root;

const Trigger = PopoverPrimitive.Trigger;

const Anchor = PopoverPrimitive.Anchor;

const Close = PopoverPrimitive.Close;

const Content = React.forwardRef<
    React.ElementRef<typeof PopoverPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, children, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={`z-50 w-72 rounded-md border border-[var(--gray-6)] bg-[var(--color-panel-solid)] p-4 text-[var(--gray-12)] shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
            {...props}
        >
            {children}
        </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
));
Content.displayName = PopoverPrimitive.Content.displayName;

const RadixPopover = {
    Root,
    Trigger,
    Content,
    Anchor,
    Close,
};

export default RadixPopover;
