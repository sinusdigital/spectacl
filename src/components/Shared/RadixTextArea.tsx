import React, { forwardRef } from 'react';
import { TextArea, Box, Text } from '@radix-ui/themes';
import { cn } from "@/lib/utils";

export interface RadixTextAreaProps extends React.ComponentPropsWithoutRef<typeof TextArea> {
    label?: string;
    error?: string;
    helperText?: string;
}

const RadixTextArea = forwardRef<HTMLTextAreaElement, RadixTextAreaProps>(
    ({ className, label, error, helperText, ...props }, ref) => {
        return (
            <Box className={cn("space-y-2", className)}>
                {label && (
                    <Text as="label" size="2" weight="medium" color="gray">
                        {label}
                    </Text>
                )}
                <TextArea
                    ref={ref}
                    size="3"
                    variant="surface"
                    color={error ? "red" : undefined}
                    {...props}
                />
                {error && (
                    <Text size="1" color="red">
                        {error}
                    </Text>
                )}
                {!error && helperText && (
                    <Text size="1" color="gray">
                        {helperText}
                    </Text>
                )}
            </Box>
        );
    }
);

RadixTextArea.displayName = "RadixTextArea";

export default RadixTextArea;
