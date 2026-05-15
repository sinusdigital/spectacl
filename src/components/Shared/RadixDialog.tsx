"use client";

import * as React from "react";
import { Dialog, Flex, Box } from "@radix-ui/themes";

const Header = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
        {...props}
    />
);
Header.displayName = "DialogHeader";

const Footer = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <Box mt="4" width="100%" className={className} {...props}>
        <Flex 
            gap="3" 
            direction={{ initial: 'column', sm: 'row' }} 
            style={{ width: '100%' }}
        >
            {(() => {
                const childArray = React.Children.toArray(children);
                return childArray.map((child, index) => {
                    if (!React.isValidElement(child)) return child;
                    
                    const element = child as React.ReactElement<{ fullWidth?: boolean; style?: React.CSSProperties }>;
                    return (
                        <Box key={index} style={{ flexGrow: 1, flexBasis: 0, minWidth: 0, width: '100%' }}>
                            {React.cloneElement(element, { 
                                fullWidth: true,
                                style: { ...(element.props.style || {}), width: '100%' }
                            })}
                        </Box>
                    );
                });
            })()}
        </Flex>
    </Box>
);
Footer.displayName = "DialogFooter";

const RadixDialog = {
    Root: Dialog.Root,
    Trigger: Dialog.Trigger,
    Content: Dialog.Content,
    Header,
    Footer,
    Title: Dialog.Title,
    Description: Dialog.Description,
    Close: Dialog.Close,
    Overlay: React.Fragment,
    Portal: React.Fragment,
};

export default RadixDialog;
