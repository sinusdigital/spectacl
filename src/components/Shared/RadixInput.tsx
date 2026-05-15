import React, { forwardRef } from 'react';
import { TextField } from '@radix-ui/themes';

export interface RadixInputProps extends React.ComponentPropsWithoutRef<typeof TextField.Root> {
    error?: boolean;
}

const RadixInput = forwardRef<HTMLInputElement, RadixInputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <TextField.Root
                ref={ref}
                size="3"
                variant="surface"
                color={error ? "red" : undefined}
                className={className}
                {...props}
            />
        );
    }
);

RadixInput.displayName = "RadixInput";

export default RadixInput;
