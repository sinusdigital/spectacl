"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import EntitySelector from "./Sidebar/EntitySelector";
import NavigationSection from "./Sidebar/NavigationSection";
import SidebarFooter from "./Sidebar/SidebarFooter";
import { getNavigationSections, getAdminSections, getGlobalSections, getSpaceSections } from "./Sidebar/navigationConfig";
import { Box, Flex, Text } from "@radix-ui/themes";

import { Entity } from "@/types/entity";

interface SidebarProps {
    user: {
        id: string;
        name: string;
        email: string;
        image?: string | null;
    };
    currentSpace: {
        id: string;
        name: string;
        logo?: string | null;
    } | null;
    spaceCount: number;
    entities: Entity[];
    isAdmin: boolean;
    featureFlags?: Record<string, string>;
    onNavigate?: () => void;
}

export default function Sidebar({ user, currentSpace, spaceCount, entities: serverEntities, isAdmin, featureFlags = {}, onNavigate }: SidebarProps) {
    const pathname = usePathname();

    // ── Client-side entity freshness ─────────────────────────────────────
    // Server provides initial entities via RSC, but layout caching can make
    // them stale after create/archive. Client re-fetches on pathname change
    // to guarantee the sidebar always reflects the current state.
    const [entities, setEntities] = useState<Entity[]>(serverEntities);

    const refreshEntities = useCallback(async () => {
        try {
            const res = await fetch("/api/entities");
            if (!res.ok) return;
            const data = await res.json();
            setEntities(data);
        } catch {
            // Silently fail — server data is still available
        }
    }, []);

    // Re-fetch when pathname changes (covers post-create, post-archive navigation)
    useEffect(() => {
        refreshEntities();
    }, [pathname, refreshEntities]);

    // Listen for in-page mutations (activate/deactivate/delete/create on same page)
    useEffect(() => {
        const handler = () => refreshEntities();
        window.addEventListener('entities-changed', handler);
        return () => window.removeEventListener('entities-changed', handler);
    }, [refreshEntities]);

    // Also sync if server props change (e.g. hard nav / revalidation)
    useEffect(() => {
        setEntities(serverEntities);
    }, [serverEntities]);

    // ── Derive current entity + sub-page from URL ────────────────────────
    const currentEntity = useMemo(() => {
        const pathParts = pathname.split('/').filter(Boolean);
        const fromUrl = entities.find(e => e.id === pathParts[0]);
        return fromUrl ?? entities[0] ?? null;
    }, [pathname, entities]);

    // ── Build navigation ─────────────────────────────────────────────────
    const promptCount = currentEntity?.activePromptCount ?? 0;
    const rankingCount = currentEntity?.activeRankingCount ?? 0;
    const suggestionCount = currentEntity?.activeSuggestionCount ?? 0;

    let navigationSections = [
        ...(currentEntity ? getNavigationSections(currentEntity.id) : []),
        ...getGlobalSections(),
        ...(currentSpace ? getSpaceSections(currentSpace.id) : []),
    ];

    // Inject active count badges into Prompts and Custom Rankings nav items
    if (currentEntity) {
        navigationSections = navigationSections.map(section => ({
            ...section,
            items: section.items.map(item => {
                if (item.id === "prompts" && promptCount > 0) {
                    return {
                        ...item,
                        name: (
                            <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
                                <span style={{ flex: 1 }}>Prompts</span>
                                <span style={{ fontSize: 10, color: "var(--gray-a10)", fontWeight: 500 }}>{promptCount}</span>
                            </span>
                        ),
                    };
                }
                if (item.id === "custom-rankings" && rankingCount > 0) {
                    return {
                        ...item,
                        name: (
                            <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
                                <span style={{ flex: 1 }}>Custom Rankings</span>
                                <span style={{ fontSize: 10, color: "var(--gray-a10)", fontWeight: 500 }}>{rankingCount}</span>
                            </span>
                        ),
                    };
                }
                if (item.id === "suggestions" && suggestionCount > 0) {
                    return {
                        ...item,
                        name: (
                            <span style={{ display: "flex", alignItems: "center", width: "100%" }}>
                                <span style={{ flex: 1 }}>Suggestions</span>
                                <span style={{ fontSize: 10, color: "var(--gray-a10)", fontWeight: 500 }}>{suggestionCount}</span>
                            </span>
                        ),
                    };
                }
                return item;
            }),
        }));
    }

    navigationSections = navigationSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!item.id) return true;
            return featureFlags[`sidebar_flag_${item.id}`] !== "false";
        })
    })).filter(section => section.items.length > 0);

    const adminSections = isAdmin ? getAdminSections() : [];

    return (
        <aside className="w-full h-full flex flex-col overflow-hidden" style={{ backgroundColor: "var(--gray-2)" }}>
            <EntitySelector
                currentEntity={currentEntity}
                entities={entities}
                currentSpace={currentSpace}
                hasMultipleSpaces={spaceCount > 1}
                onNavigate={onNavigate}
            />

            <Box flexGrow="1" className="overflow-y-auto overflow-x-hidden min-h-0 px-2 py-3">
                <nav>
                    {navigationSections.length > 0 ? (
                        navigationSections.map((section) => (
                            <NavigationSection
                                key={section.title}
                                title={section.title}
                                items={section.items}
                                currentPath={pathname}
                                collapsible={section.collapsible}
                                onNavigate={onNavigate}
                            />
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm" style={{ color: "var(--gray-9)" }}>
                            Select an entity to view navigation
                        </div>
                    )}

                    {adminSections.length > 0 && (
                        <Box
                            pt="3" pb="1" px="2"
                            style={{
                                marginTop: 'var(--space-4)',
                                marginLeft: 'calc(-1 * var(--space-2))',
                                marginRight: 'calc(-1 * var(--space-2))',
                                backgroundColor: "var(--gray-3)",
                                borderTop: "1px solid var(--gray-a5)",
                            }}
                        >
                            <Flex align="center" gap="1" px="3" mb="2">
                                <Text
                                    size="1" weight="bold"
                                    style={{
                                        fontSize: 10,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        color: 'var(--amber-11)',
                                    }}
                                >
                                    Admin
                                </Text>
                                <Text
                                    size="1"
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 500,
                                        padding: '1px 6px',
                                        borderRadius: 'var(--radius-1)',
                                        backgroundColor: 'var(--amber-a3)',
                                        color: 'var(--amber-11)',
                                    }}
                                >
                                    {user.email}
                                </Text>
                            </Flex>
                            {adminSections.map((section) => (
                                <NavigationSection
                                    key={section.title}
                                    title={section.title}
                                    items={section.items}
                                    currentPath={pathname}
                                    collapsible={section.collapsible}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </Box>
                    )}
                </nav>
            </Box>

            <SidebarFooter user={user} onNavigate={onNavigate} />
        </aside>
    );
}
