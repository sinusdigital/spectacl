"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import Link from "next/link";

/**
 * RadixTabs component matching the specific "Lime" aesthetic from the demo page.
 * Supports sticky positioning and Link-based triggers.
 */

const Root = TabsPrimitive.Root;

interface RadixTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
    sticky?: boolean;
}

const List = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    RadixTabsListProps
>(({ className = "", children, sticky, ...props }, ref) => {
    const [isStuck, setIsStuck] = React.useState(false);
    const innerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!sticky) return;
        
        const cachedRef = innerRef.current;
        const observer = new IntersectionObserver(
            ([e]) => setIsStuck(e.intersectionRatio < 1),
            { threshold: [1], rootMargin: "-1px 0px 0px 0px" }
        );

        if (cachedRef) observer.observe(cachedRef);
        return () => {
            if (cachedRef) observer.unobserve(cachedRef);
        };
    }, [sticky]);

    // Handle forwarded ref
    React.useImperativeHandle(ref, () => innerRef.current!);

    const stickyStyles = isStuck ? "backdrop-blur-xl pt-2" : "pt-2";

    return (
        <TabsPrimitive.List
            ref={innerRef}
            className={`flex gap-2 border-b border-gray-200 mb-6 relative transition-all duration-300 ${sticky ? "sticky top-0 z-40" : ""} ${stickyStyles} ${className}`}
            {...props}
        >
            {children}
        </TabsPrimitive.List>
    );
});
List.displayName = "RadixTabs.List";

interface RadixTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
    href?: string;
}

const Trigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    RadixTabsTriggerProps
>(({ className = "", children, href, ...props }, ref) => {
    const triggerStyles = `
        relative flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-500 
        rounded-md transition-colors hover:text-gray-900 hover:bg-gray-100 data-[state=active]:text-gray-900 
        outline-none mb-2 after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-[2px] 
        after:bg-[var(--accent-9)] after:content-[''] after:scale-x-0 data-[state=active]:after:scale-x-100 
        after:transition-transform
        ${className}
    `;

    if (href) {
        return (
            <TabsPrimitive.Trigger
                ref={ref}
                asChild
                value={props.value}
                className={triggerStyles}
            >
                <Link href={href}>
                    {children}
                </Link>
            </TabsPrimitive.Trigger>
        );
    }

    return (
        <TabsPrimitive.Trigger
            ref={ref}
            className={triggerStyles}
            {...props}
        >
            {children}
        </TabsPrimitive.Trigger>
    );
});
Trigger.displayName = "RadixTabs.Trigger";

const Content = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className = "", children, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={`outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-9)] focus-visible:ring-offset-2 rounded-lg ${className}`}
        {...props}
    >
        {children}
    </TabsPrimitive.Content>
));
Content.displayName = "RadixTabs.Content";

const RadixTabs = {
    Root,
    List,
    Trigger,
    Content,
};

export default RadixTabs;
