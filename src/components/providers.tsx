"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { ProviderStack, ProviderDefinition } from "@beluga-labs/provider-stack";
import { TranslationProvider } from "@beluga-labs/i18n";
import { translations } from "@/i18n";
import { ToastProvider } from "@/components/Shared/RadixToast";

export function ClientProviders({ children }: { children: React.ReactNode }) {
    const providers: ProviderDefinition[] = [
        [TranslationProvider, { translations, locale: "en" }],
        [ToastProvider, {}],
    ];

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="spectacl-theme"
            disableTransitionOnChange={false}
        >
            <ProviderStack providers={providers}>{children}</ProviderStack>
        </ThemeProvider>
    );
}
