import { Flex } from "@radix-ui/themes";
import { isSelfHosted } from "@/lib/mode";
import {
    DashboardIcon,
    ChatBubbleIcon,
    Link2Icon,
    BarChartIcon,
    RocketIcon,
    MagnifyingGlassIcon,
    BookmarkIcon,
    GearIcon,
    LockClosedIcon,
    PersonIcon,
    LightningBoltIcon,
    LayersIcon,
    EnvelopeClosedIcon,
    LayoutIcon,
    CubeIcon,
    GlobeIcon,
    ExternalLinkIcon,
    TrashIcon,
    LapTimerIcon,
    ReaderIcon,
    CountdownTimerIcon,
    FileTextIcon,
} from "@radix-ui/react-icons";

interface NavigationItem {
    id?: string;
    name: string | React.ReactNode;
    href: string;
    icon?: React.ReactNode;
    children?: { name: string; href: string }[];
    target?: string;
}

interface NavigationSection {
    title: string;
    items: NavigationItem[];
    collapsible?: boolean;
}

export function getGlobalSections(): NavigationSection[] {
    return [
        {
            title: "Global Insights",
            items: [
                {
                    id: "global-citations",
                    name: "Top Cited Platform Domains",
                    href: "/insights",
                    icon: <GlobeIcon />
                }
            ]
        }
    ];
}

export function getNavigationSections(entityId: string): NavigationSection[] {
    return [
        {
            title: "Analyse",
            items: [
                {
                    id: "visibility-overview",
                    name: "Visibility Overview",
                    href: `/${entityId}`,
                    icon: <DashboardIcon />
                },
                {
                    id: "prompts",
                    name: "Prompts",
                    href: `/${entityId}/prompts`,
                    icon: <ChatBubbleIcon />
                },
                {
                    id: "sources",
                    name: "Sources",
                    href: `/${entityId}/sources`,
                    icon: <Link2Icon />
                },
                 {
                    id: "custom-rankings",
                    name: "Custom Rankings",
                    href: `/${entityId}/ranking`,
                    icon: <BarChartIcon />
                }
            ]
        },
        {
            title: "Improve",
            items: [
                {
                    id: "suggestions",
                    name: "Suggestions",
                    href: `/${entityId}/suggestions`,
                    icon: <RocketIcon />
                },
                {
                    id: "prompt-discovery",
                    name: "Prompt Discovery",
                    href: `/${entityId}/prompts/discovery`,
                    icon: <MagnifyingGlassIcon />
                }
            ]
        },
        {
            title: "Configure",
            items: [
                {
                    id: "competitors",
                    name: "Competitors",
                    href: `/${entityId}/competitors`,
                    icon: (
                        <svg className="w-[15px] h-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    )
                },
                {
                    id: "tags",
                    name: "Tags",
                    href: `/${entityId}/prompts/tags`,
                    icon: <BookmarkIcon />
                },
            ]
        }
    ];
}


export function getAdminSections(): NavigationSection[] {
    const selfHosted = isSelfHosted();

    return [
        {
            title: "Configuration",
            collapsible: true,
            items: [
                { name: "Settings", href: "/admin", icon: <GearIcon /> },
                { name: "Master LLMs", href: "/admin/master-llms", icon: <CubeIcon /> },
                { name: "Prompt Configuration", href: "/admin/prompt-configuration", icon: <GlobeIcon /> },
                { name: "Domain Registry", href: "/admin/domain-registry", icon: <GlobeIcon /> },
                { name: "AEO Playbook", href: "/admin/aeo-playbook", icon: <CubeIcon /> },
                // Pricing — cloud mode only
                ...(!selfHosted ? [{ name: "Pricing", href: "/admin/pricing", icon: <LockClosedIcon /> }] : []),
            ]
        },
        {
            title: "Operations",
            collapsible: true,
            items: [
                { name: "Spaces", href: "/admin/spaces", icon: <CubeIcon /> },
                { name: "Users", href: "/admin/users", icon: <PersonIcon /> },
                { name: "Waitlist", href: "/admin/waitlist", icon: <EnvelopeClosedIcon /> },
                { name: "Usage Forecast", href: "/admin/usage-forecast", icon: <BarChartIcon /> },
                // Invoices & Payments — cloud mode only
                ...(!selfHosted ? [
                    { name: "Invoices", href: "/admin/invoices", icon: <FileTextIcon /> },
                    { name: "Payments", href: "/admin/payments", icon: <CubeIcon /> },
                ] : []),
                { name: "Audit Log", href: "/admin/audit-log", icon: <ReaderIcon /> },
                { name: "Deletion Logs", href: "/admin/deletion-logs", icon: <TrashIcon /> },
            ]
        },
        {
            title: "System Health",
            collapsible: true,
            items: [
                { name: "Workers", href: "/admin/workers", icon: <LightningBoltIcon /> },
                { name: "Cron Jobs", href: "/admin/cron", icon: <CountdownTimerIcon /> },
                { name: "Environment", href: "/admin/env", icon: <GearIcon /> },
                {
                    name: (
                        <Flex align="center" gap="1">
                            BullMQ Queues <ExternalLinkIcon width="12" height="12" />
                        </Flex>
                    ),
                    href: "/admin/queues",
                    icon: <LayersIcon />,
                    target: "_blank"
                },
            ]
        },
        {
            title: "Reference",
            collapsible: true,
            items: [
                { name: "Security", href: "/admin/security", icon: <LockClosedIcon /> },
                { name: "Emails", href: "/admin/emails", icon: <EnvelopeClosedIcon /> },
                { name: "Performance", href: "/admin/performance", icon: <LapTimerIcon /> },
            ]
        },
        {
            title: "Demo",
            collapsible: true,
            items: [
                { name: "Modals Demo", href: "/admin/modals-demo", icon: <LayoutIcon /> },
                { name: "Radix Demo", href: "/admin/radix-demo", icon: <CubeIcon /> },
                // Invoice Demo — cloud mode only
                ...(!selfHosted ? [{ name: "Invoice Demo", href: "/admin/invoice-demo", icon: <FileTextIcon /> }] : []),
            ]
        }
    ];
}

export function getSpaceSections(spaceId: string): NavigationSection[] {
    const items: NavigationItem[] = [
        {
            id: "space-settings",
            name: "Settings",
            href: "/settings",
            icon: <GearIcon />
        },
    ];

    // Billing nav item — cloud mode only
    if (!isSelfHosted()) {
        items.push({
            id: "space-billing",
            name: "Billing",
            href: `/spaces/${spaceId}/billing`,
            icon: <LightningBoltIcon />
        });
    }

    return [{ title: "Space Settings", items }];
}

