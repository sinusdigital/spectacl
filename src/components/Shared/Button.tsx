"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button as RadixThemeButton } from "@radix-ui/themes";

type ButtonVariant =
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "ghost"
    | "ghost-danger";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps
    extends Omit<React.ComponentPropsWithoutRef<typeof RadixThemeButton>, "size" | "variant" | "weight"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
    weight?: "light" | "regular" | "medium" | "semibold" | "bold";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "primary",
            size = "md",
            isLoading = false,
            loadingText,
            icon,
            children,
            disabled,
            fullWidth = false,
            weight,
            ...props
        },
        ref
    ) => {
        let themeVariant: 'solid' | 'soft' | 'outline' | 'surface' | 'ghost' = 'solid';
        let color: 'gray' | 'red' | undefined = undefined;

        switch (variant) {
            case 'primary': themeVariant = 'solid'; break;
            case 'secondary': themeVariant = 'soft'; color = 'gray'; break;
            case 'tertiary': themeVariant = 'surface'; color = 'gray'; break;
            case 'danger': themeVariant = 'solid'; color = 'red'; break;
            case 'ghost': themeVariant = 'ghost'; color = 'gray'; break;
            case 'ghost-danger': themeVariant = 'ghost'; color = 'red'; break;
        }

        let themeSize: '1' | '2' | '3' | '4' = '3';
        switch (size) {
            case 'xs': themeSize = '1'; break;
            case 'sm': themeSize = '2'; break;
            case 'md': themeSize = '3'; break;
            case 'lg': themeSize = '4'; break;
            case 'xl': themeSize = '4'; break;
        }

        return (
            <RadixThemeButton
                ref={ref}
                variant={themeVariant}
                size={themeSize}
                color={color}
                disabled={disabled || isLoading}
                className={cn(
                    weight === "semibold" && "font-semibold",
                    weight === "bold" && "font-bold",
                    className
                )}
                style={{ width: fullWidth ? '100%' : undefined, ...props.style }}
                loading={isLoading}
                {...props}
            >
                {isLoading && loadingText ? (
                    loadingText
                ) : !isLoading && icon ? (
                    <React.Fragment>
                        <span className="flex-shrink-0">{icon}</span>
                        {children}
                    </React.Fragment>
                ) : (
                    children
                )}
            </RadixThemeButton>
        );
    }
);

Button.displayName = "Button";

export default Button;
