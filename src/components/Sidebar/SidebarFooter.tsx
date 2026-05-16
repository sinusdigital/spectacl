'use client';

import Link from 'next/link';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { GearIcon, ExitIcon, SunIcon, MoonIcon, DesktopIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { DropdownMenu } from '@radix-ui/themes';
import { UserAvatar } from '@/components/Shared/UserAvatar';

interface SidebarFooterProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
    onNavigate?: () => void;
}

const APPEARANCE_OPTIONS = [
    { value: 'light',  label: 'Light',  Icon: SunIcon     },
    { value: 'dark',   label: 'Dark',   Icon: MoonIcon    },
    { value: 'system', label: 'System', Icon: DesktopIcon },
] as const;

export default function SidebarFooter({ user, onNavigate }: SidebarFooterProps) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    const handleSignOut = async () => {
        onNavigate?.();
        await signOut();
        // Hard navigation forces root layout re-render, clearing stale sidebar data
        window.location.href = '/login';
    };

    if (!user) {
        return (
            <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--gray-a4)" }}>
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: "var(--gray-a3)" }} />
            </div>
        );
    }

    const themeToggle = (
        <div
            className="flex rounded-md p-px gap-px shrink-0"
            style={{ backgroundColor: "var(--gray-a3)" }}
        >
            {APPEARANCE_OPTIONS.map(({ value, Icon }) => {
                const active = mounted && theme === value;
                return (
                    <button
                        key={value}
                        onClick={() => setTheme(value)}
                        title={value.charAt(0).toUpperCase() + value.slice(1)}
                        className="flex items-center justify-center rounded transition-all duration-150"
                        style={{
                            width: 20,
                            height: 20,
                            backgroundColor: active ? "var(--color-panel-solid)" : "transparent",
                            color: active ? "var(--gray-12)" : "var(--gray-9)",
                            boxShadow: active ? "0 1px 2px rgba(0,0,0,0.10)" : "none",
                        }}
                    >
                        <Icon style={{ width: 10, height: 10 }} />
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="px-2 pb-2 pt-1.5 shrink-0" style={{ borderTop: "1px solid var(--gray-a4)" }}>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <button
                        className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 hover:bg-[var(--gray-a3)] group focus:outline-none"
                    >
                        <span className="shrink-0">
                            <UserAvatar
                                name={user.name}
                                email={user.email}
                                image={user.image}
                                size="sm"
                            />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium leading-tight truncate" style={{ color: "var(--gray-12)" }}>
                                {user.name || 'User'}
                            </div>
                            <div className="text-[11px] leading-tight truncate" style={{ color: "var(--gray-9)" }}>
                                {user.email}
                            </div>
                        </div>
                        <ChevronUpIcon
                            className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity duration-150"
                            style={{ color: "var(--gray-11)" }}
                        />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content
                    side="top"
                    align="start"
                    sideOffset={8}
                    style={{ minWidth: 232, zIndex: 200 }}
                >
                    {/* User identity — non-interactive header */}
                    <div className="px-2 pt-1 pb-2">
                        <div className="flex items-center gap-2.5">
                            <UserAvatar
                                name={user.name}
                                email={user.email}
                                image={user.image}
                                size="sm"
                            />
                            <div className="min-w-0">
                                <div className="text-[13px] font-semibold truncate" style={{ color: "var(--gray-12)" }}>
                                    {user.name || 'User'}
                                </div>
                                <div className="text-[11px] truncate" style={{ color: "var(--gray-9)" }}>
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settings */}
                    <DropdownMenu.Item onClick={() => { router.push('/user-settings'); onNavigate?.(); }}>
                        <GearIcon className="w-4 h-4" />
                        Settings
                    </DropdownMenu.Item>

                    {/* Sign out */}
                    <DropdownMenu.Item color="red" onClick={handleSignOut} className="flex items-center gap-2">
                        <ExitIcon className="w-4 h-4" />
                        Sign out
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>

            {/* Meta — terms/privacy/version left, theme toggle right */}
            <div className="px-3 pt-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: "var(--gray-a7)" }}>
                    <Link href="/terms" className="hover:text-[var(--gray-10)] transition-colors">Terms</Link>
                    <span>·</span>
                    <Link href="/privacy" className="hover:text-[var(--gray-10)] transition-colors">Privacy</Link>
                    <span>·</span>
                    <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                </div>
                {themeToggle}
            </div>
        </div>
    );
}
