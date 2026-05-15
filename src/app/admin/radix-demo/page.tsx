"use client";

import { useState } from "react";
import RadixSelect from "@/components/Shared/RadixSelect";
import RadixDropdownMenu from "@/components/Shared/RadixDropdownMenu";
import RadixDialog from "@/components/Shared/RadixDialog";
import RadixPopover from "@/components/Shared/RadixPopover";
import Header from "@/components/Shared/Header";
import { Tooltip, Badge, Flex, RadioGroup } from "@radix-ui/themes";
import BuildingIcon from "@/components/Icons/BuildingIcon";
import Button from "@/components/Shared/Button";
import RadixStepper from "@/components/Shared/RadixStepper";
import RadixSwitch from "@/components/Shared/RadixSwitch";
import RadixCheckbox from "@/components/Shared/RadixCheckbox";
import RadixAccordion from "@/components/Shared/RadixAccordion";
import RadixSlider from "@/components/Shared/RadixSlider";
import RadixProgress from "@/components/Shared/RadixProgress";
import RadixSeparator from "@/components/Shared/RadixSeparator";

import RadixToggle from "@/components/Shared/RadixToggle";
import RadixToggleGroup from "@/components/Shared/RadixToggleGroup";
import RadixSegmentedControl from "@/components/Shared/RadixSegmentedControl";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

import {
    HomeIcon,
    GearIcon,
    PersonIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    Cross2Icon,
    DotsHorizontalIcon,
    ChevronRightIcon,
    BellIcon,
    EnvelopeClosedIcon,
    FileTextIcon,
    DashboardIcon,
    BarChartIcon,
    CalendarIcon,
    ClockIcon,
    StarIcon,
    StarFilledIcon,
    HeartIcon,
    HeartFilledIcon,
    TrashIcon,
    Pencil1Icon,
    CopyIcon,
    DownloadIcon,
    UploadIcon,
    Share1Icon,
    ExternalLinkIcon,
    LinkBreak2Icon,
    LockClosedIcon,
    LockOpen1Icon,
    EyeOpenIcon,
    EyeClosedIcon,
    CheckCircledIcon,
    CrossCircledIcon,
    ExclamationTriangleIcon,
    InfoCircledIcon,
    QuestionMarkCircledIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ReloadIcon,
    UpdateIcon,
    MixerHorizontalIcon,
    SunIcon,
    MoonIcon,
    RocketIcon,
    LightningBoltIcon,
    TargetIcon,
    LayersIcon,
    ComponentInstanceIcon,
    FontBoldIcon,
    FontItalicIcon,
    UnderlineIcon,
    ViewGridIcon,
    ViewHorizontalIcon,
} from "@radix-ui/react-icons";

import RadixTable from "@/components/Shared/RadixTable";
import RadixMultiSelect from "@/components/Shared/RadixMultiSelect";
import RadixTabs from "@/components/Shared/RadixTabs";
import { useToast } from "@/components/Shared/RadixToast";

export default function RadixDemoPage() {
    const [selectedModel, setSelectedModel] = useState("gpt-4");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [activeTab, setActiveTab] = useState("colors");
    const [frequency, setFrequency] = useState("daily");
    const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
    const [demoExpandedRow, setDemoExpandedRow] = useState(false);
    const [tableVariant, setTableVariant] = useState<"surface" | "ghost">("surface");

    const tabs = [
        { id: 'colors', label: 'Colors' },
        { id: 'buttons', label: 'Buttons' },
        { id: 'icons', label: 'Icons' },
        { id: 'select', label: 'Select & Menus' },
        { id: 'interactive', label: 'Interactive' },
        { id: 'table', label: 'Table' },
        { id: 'toast', label: 'Toast' },
    ];

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        const element = document.getElementById(tabId);
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    return (
            <div className="min-h-screen w-full max-w-[1920px] mx-auto px-6 py-8">
                <div className="w-full space-y-8">
                    <Header.Root mb="4" className="sticky top-0 z-20 bg-gray-50/80 backdrop-blur-md pt-4 -mx-6 px-6">
                        <Header.Content>
                            <Header.Kicker>Admin Tools</Header.Kicker>
                            <Header.Title size="8">Radix UI Component Demo</Header.Title>
                            <Header.Description>Explore accessible, unstyled components ready for integration into Spectacl</Header.Description>
                        </Header.Content>
                    </Header.Root>

                    <RadixTabs.Root value={activeTab} onValueChange={handleTabChange} className="space-y-8">
                        <div className="sticky top-[108px] z-20 bg-gray-50/80 backdrop-blur-md pb-4 pt-2 -mx-6 px-6 border-b border-gray-200">
                            <RadixTabs.List>
                                {tabs.map((tab) => (
                                    <RadixTabs.Trigger key={tab.id} value={tab.id}>
                                        {tab.label}
                                    </RadixTabs.Trigger>
                                ))}
                            </RadixTabs.List>
                        </div>

                        <div className="gap-6 space-y-6 mt-6">

                    {/* Colors Demo */}
                    <div id="colors" className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Radix Colors</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Custom lime-gray color palette with 12-step scales. Each step serves a specific purpose in the UI.
                        </p>

                        {/* Lime Scale */}
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Lime (Accent)</h3>
                            <div className="grid grid-cols-12 gap-1 mb-2">
                                <ColorSwatch color="var(--accent-1)" label="1" />
                                <ColorSwatch color="var(--accent-2)" label="2" />
                                <ColorSwatch color="var(--accent-3)" label="3" />
                                <ColorSwatch color="var(--accent-4)" label="4" />
                                <ColorSwatch color="var(--accent-5)" label="5" />
                                <ColorSwatch color="var(--accent-6)" label="6" />
                                <ColorSwatch color="var(--accent-7)" label="7" />
                                <ColorSwatch color="var(--accent-8)" label="8" />
                                <ColorSwatch color="var(--accent-9)" label="9" dark />
                                <ColorSwatch color="var(--accent-10)" label="10" dark />
                                <ColorSwatch color="var(--accent-11)" label="11" dark />
                                <ColorSwatch color="var(--accent-12)" label="12" dark />
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500">
                                <span>1-2: Backgrounds</span>
                                <span>3-5: Interactive</span>
                                <span>6-8: Borders</span>
                                <span>9-10: Solid</span>
                                <span>11-12: Text</span>
                            </div>
                        </div>

                        {/* Gray Scale */}
                        <div className="mb-8">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Gray (Neutral)</h3>
                            <div className="grid grid-cols-12 gap-1 mb-2">
                                <ColorSwatch color="var(--gray-1)" label="1" />
                                <ColorSwatch color="var(--gray-2)" label="2" />
                                <ColorSwatch color="var(--gray-3)" label="3" />
                                <ColorSwatch color="var(--gray-4)" label="4" />
                                <ColorSwatch color="var(--gray-5)" label="5" />
                                <ColorSwatch color="var(--gray-6)" label="6" />
                                <ColorSwatch color="var(--gray-7)" label="7" />
                                <ColorSwatch color="var(--gray-8)" label="8" />
                                <ColorSwatch color="var(--gray-9)" label="9" dark />
                                <ColorSwatch color="var(--gray-10)" label="10" dark />
                                <ColorSwatch color="var(--gray-11)" label="11" dark />
                                <ColorSwatch color="var(--gray-12)" label="12" dark />
                            </div>
                        </div>

                        {/* Red Scale */}
                        <div className="mb-6 border-b border-gray-100 pb-8">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Red (Error)</h3>
                            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mb-2">
                                <ColorSwatch color="var(--red-1)" label="1" />
                                <ColorSwatch color="var(--red-2)" label="2" />
                                <ColorSwatch color="var(--red-3)" label="3" />
                                <ColorSwatch color="var(--red-4)" label="4" />
                                <ColorSwatch color="var(--red-5)" label="5" />
                                <ColorSwatch color="var(--red-6)" label="6" />
                                <ColorSwatch color="var(--red-7)" label="7" />
                                <ColorSwatch color="var(--red-8)" label="8" />
                                <ColorSwatch color="var(--red-9)" label="9" dark />
                                <ColorSwatch color="var(--red-10)" label="10" dark />
                                <ColorSwatch color="var(--red-11)" label="11" dark />
                                <ColorSwatch color="var(--red-12)" label="12" dark />
                            </div>
                        </div>

                        {/* Workspace Gradient */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Workspace Brand</h3>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-10)] to-[var(--accent-9)] rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm border border-gray-100">
                                        <BuildingIcon className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-gray-900 uppercase">Icon Gradient</span>
                                        <span className="text-[10px] text-gray-500 font-mono">from-primary-dark to-primary-light</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-8 h-8 rounded bg-[var(--accent-10)] border border-gray-100 shadow-sm" title="Primary Dark" />
                                    <div className="w-8 h-8 rounded bg-[var(--accent-9)] border border-gray-100 shadow-sm" title="Primary Light" />
                                </div>
                            </div>
                        </div>

                        {/* Usage Examples */}


                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <strong>Setup:</strong> Import <code className="bg-gray-200 px-1 rounded">@/styles/radix-colors.css</code> in your layout to use these CSS variables.
                                Use <code className="bg-gray-200 px-1 rounded">var(--accent-9)</code> for accents and <code className="bg-gray-200 px-1 rounded">var(--gray-*)</code> for neutrals.
                            </p>
                        </div>
                    </div>
                    </div>

                    <div className="flex flex-col gap-6 mt-6">

                    {/* Buttons Demo */}
                    <div id="buttons" className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 scroll-mt-24">
                        <div className="flex items-baseline gap-4 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Button</h2>
                            <a href="#" className="text-sm text-blue-600 hover:underline">View in docs</a>
                        </div>
                        
                        <RadixTabs.Root defaultValue="variants">
                            <RadixTabs.List>
                                <RadixTabs.Trigger value="variants">
                                    Variants
                                </RadixTabs.Trigger>
                                <RadixTabs.Trigger value="sizes">
                                    Sizes
                                </RadixTabs.Trigger>
                                <RadixTabs.Trigger value="layout">
                                    Layout
                                </RadixTabs.Trigger>
                            </RadixTabs.List>

                            <RadixTabs.Content value="variants">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        {/* ... table content ... */}
                                        <thead>
                                            <tr>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">Variant</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">Default</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">With Icon</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">Disabled</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Primary</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" disabled>Next</Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Secondary</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="secondary">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="secondary">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="secondary" disabled>Next</Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Tertiary</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="tertiary">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="tertiary">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="tertiary" disabled>Next</Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Danger</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="danger">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="danger">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="danger" disabled>Next</Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Ghost</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="ghost">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="ghost">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="ghost" disabled>Next</Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Ghost Danger</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="ghost-danger">Delete</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="ghost-danger">
                                                        Delete <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="ghost-danger" disabled>Delete</Button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </RadixTabs.Content>

                            <RadixTabs.Content value="sizes">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">Size</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">Default</th>
                                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 border-b w-1/4">With Icon</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Small (sm)</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="sm">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="sm">
                                                        Next <ChevronRightIcon className="w-3 h-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Medium (md)</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="md">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="md">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Large (lg)</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="lg">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="lg">
                                                        Next <ChevronRightIcon className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-4 px-4 text-sm font-medium text-gray-900">Extra Large (xl)</td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="xl">Next</Button>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Button variant="primary" size="xl">
                                                        Next <ChevronRightIcon className="w-5 h-5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </RadixTabs.Content>

                            <RadixTabs.Content value="layout">
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Full Width (Stacked)</h3>
                                        <div className="max-w-sm p-6 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
                                            <div className="h-16 bg-gray-50 rounded-lg animate-pulse" />
                                            <div className="h-4 bg-gray-50 rounded w-2/3 animate-pulse" />
                                            <div className="pt-4">
                                                <Button variant="primary" fullWidth>
                                                    Sign In to Account
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Grid Layout (50/50 Split)</h3>
                                        <div className="max-w-sm p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                                            <div className="h-16 bg-gray-50 rounded-lg animate-pulse mb-4" />
                                            <div className="h-4 bg-gray-50 rounded w-3/4 animate-pulse mb-2" />
                                            <div className="h-4 bg-gray-50 rounded w-1/2 animate-pulse mb-6" />
                                            
                                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                                                <Button variant="tertiary" fullWidth>
                                                    Cancel
                                                </Button>
                                                <Button variant="primary" fullWidth>
                                                    Confirm
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Using <code>grid-cols-2</code> and <code>gap-3</code> with <code>fullWidth</code> buttons.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Medium Actions (Explicit)</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Card 1: Single Secondary */}
                                            <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
                                                <div className="h-4 bg-gray-50 rounded w-1/3 animate-pulse mb-4" />
                                                <div className="h-20 bg-gray-50 rounded-lg animate-pulse mb-auto" />
                                                <div className="pt-4 mt-6 border-t border-gray-100">
                                                    <Button variant="secondary" size="md" fullWidth>
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 2: Split Danger/Ghost */}
                                            <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full">
                                                <div className="h-4 bg-gray-50 rounded w-1/2 animate-pulse mb-4" />
                                                <div className="h-8 bg-gray-50 rounded-lg animate-pulse mb-auto" />
                                                <div className="grid grid-cols-2 gap-3 pt-4 mt-6 border-t border-gray-100">
                                                    <Button variant="ghost" size="md" fullWidth>
                                                        Cancel
                                                    </Button>
                                                    <Button variant="danger" size="md" fullWidth>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Small Actions (Dense)</h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Card 1: Single Primary */}
                                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full">
                                                <div className="h-3 bg-gray-50 rounded w-1/2 animate-pulse mb-3" />
                                                <div className="h-10 bg-gray-50 rounded animate-pulse mb-auto" />
                                                <div className="pt-3 mt-4 border-t border-gray-100">
                                                    <Button variant="primary" size="sm" fullWidth>
                                                        Add
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 2: Single Secondary */}
                                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full">
                                                <div className="h-3 bg-gray-50 rounded w-1/3 animate-pulse mb-3" />
                                                <div className="h-8 bg-gray-50 rounded animate-pulse mb-auto" />
                                                <div className="pt-3 mt-4 border-t border-gray-100">
                                                    <Button variant="secondary" size="sm" fullWidth>
                                                        Details
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 3: Split Tertiary */}
                                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full">
                                                <div className="h-3 bg-gray-50 rounded w-2/3 animate-pulse mb-3" />
                                                <div className="h-6 bg-gray-50 rounded animate-pulse mb-auto" />
                                                <div className="grid grid-cols-2 gap-2 pt-3 mt-4 border-t border-gray-100">
                                                    <Button variant="ghost" size="sm" fullWidth>
                                                        No
                                                    </Button>
                                                    <Button variant="tertiary" size="sm" fullWidth>
                                                        Yes
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Card 4: Single Ghost */}
                                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col h-full">
                                                <div className="h-3 bg-gray-50 rounded w-1/4 animate-pulse mb-3" />
                                                <div className="h-12 bg-gray-50 rounded animate-pulse mb-auto" />
                                                <div className="pt-3 mt-4 border-t border-gray-100">
                                                    <Button variant="ghost" size="sm" fullWidth>
                                                        Dismiss
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </RadixTabs.Content>
                        </RadixTabs.Root>
                    </div>


                    {/* Stepper Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Stepper</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Multi-step forms, onboarding flows, progress tracking
                        </p>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Stepper</h3>
                                <RadixStepper steps={['Step 1', 'Step 2', 'Step 3']} currentStep={1} />
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active State</h3>
                                <RadixStepper steps={['Account', 'Profile', 'Review']} currentStep={2} />
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed State</h3>
                                <RadixStepper steps={['Select Plan', 'Payment', 'Confirmation']} currentStep={3} />
                            </div>
                        </div>
                    </div>

                    {/* Icons Demo */}
                    <div id="icons" className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Radix Icons</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            15x15 pixel icons designed to work seamlessly with Radix UI components. All icons have consistent sizing and can be colored with text color classes.
                        </p>

                        {/* Navigation Icons */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Navigation</h3>
                            <div className="flex flex-wrap gap-3">
                                <IconBox icon={<HomeIcon />} label="Home" />
                                <IconBox icon={<DashboardIcon />} label="Dashboard" />
                                <IconBox icon={<GearIcon />} label="Settings" />
                                <IconBox icon={<PersonIcon />} label="User" />
                                <IconBox icon={<MagnifyingGlassIcon />} label="Search" />
                                <IconBox icon={<ChevronRightIcon />} label="Chevron" />
                                <IconBox icon={<ArrowLeftIcon />} label="Left" />
                                <IconBox icon={<ArrowRightIcon />} label="Right" />
                                <IconBox icon={<ArrowUpIcon />} label="Up" />
                                <IconBox icon={<ArrowDownIcon />} label="Down" />
                                <IconBox icon={<ExternalLinkIcon />} label="External" />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h3>
                            <div className="flex flex-wrap gap-3">
                                <IconBox icon={<PlusIcon />} label="Add" />
                                <IconBox icon={<Cross2Icon />} label="Close" />
                                <IconBox icon={<Pencil1Icon />} label="Edit" />
                                <IconBox icon={<TrashIcon />} label="Delete" color="text-red-500" />
                                <IconBox icon={<CopyIcon />} label="Copy" />
                                <IconBox icon={<DownloadIcon />} label="Download" />
                                <IconBox icon={<UploadIcon />} label="Upload" />
                                <IconBox icon={<Share1Icon />} label="Share" />
                                <IconBox icon={<ReloadIcon />} label="Reload" />
                                <IconBox icon={<DotsHorizontalIcon />} label="More" />
                            </div>
                        </div>

                        {/* Status & Feedback */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Status & Feedback</h3>
                            <div className="flex flex-wrap gap-3">
                                <IconBox icon={<CheckCircledIcon />} label="Success" color="text-green-500" />
                                <IconBox icon={<CrossCircledIcon />} label="Error" color="text-red-500" />
                                <IconBox icon={<ExclamationTriangleIcon />} label="Warning" color="text-yellow-500" />
                                <IconBox icon={<InfoCircledIcon />} label="Info" color="text-blue-500" />
                                <IconBox icon={<QuestionMarkCircledIcon />} label="Help" />
                                <IconBox icon={<BellIcon />} label="Notification" />
                                <IconBox icon={<UpdateIcon />} label="Update" />
                            </div>
                        </div>

                        {/* Toggle States */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Toggle States</h3>
                            <div className="flex flex-wrap gap-3">
                                <IconBox icon={<StarIcon />} label="Star" />
                                <IconBox icon={<StarFilledIcon />} label="Star (filled)" color="text-yellow-500" />
                                <IconBox icon={<HeartIcon />} label="Heart" />
                                <IconBox icon={<HeartFilledIcon />} label="Heart (filled)" color="text-red-500" />
                                <IconBox icon={<EyeOpenIcon />} label="Visible" />
                                <IconBox icon={<EyeClosedIcon />} label="Hidden" />
                                <IconBox icon={<LockClosedIcon />} label="Locked" />
                                <IconBox icon={<LockOpen1Icon />} label="Unlocked" />
                                <IconBox icon={<SunIcon />} label="Light" />
                                <IconBox icon={<MoonIcon />} label="Dark" />
                            </div>
                        </div>

                        {/* Data & Content */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data & Content</h3>
                            <div className="flex flex-wrap gap-3">
                                <IconBox icon={<FileTextIcon />} label="Document" />
                                <IconBox icon={<BarChartIcon />} label="Analytics" />
                                <IconBox icon={<CalendarIcon />} label="Calendar" />
                                <IconBox icon={<ClockIcon />} label="Time" />
                                <IconBox icon={<EnvelopeClosedIcon />} label="Email" />
                                <IconBox icon={<LayersIcon />} label="Layers" />
                                <IconBox icon={<MixerHorizontalIcon />} label="Filter" />
                                <IconBox icon={<LinkBreak2Icon />} label="Unlink" />
                            </div>
                        </div>

                        {/* Special */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Special</h3>
                            <div className="flex flex-wrap gap-3">
                                <IconBox icon={<RocketIcon />} label="Launch" color="text-blue-500" />
                                <IconBox icon={<LightningBoltIcon />} label="Fast" color="text-yellow-500" />
                                <IconBox icon={<TargetIcon />} label="Target" color="text-red-500" />
                                <IconBox icon={<ComponentInstanceIcon />} label="Component" color="text-purple-500" />
                            </div>
                        </div>

                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                                <strong>Usage:</strong> Import icons from <code className="bg-gray-200 px-1 rounded">@radix-ui/react-icons</code> and use them like any React component.
                                They inherit the current text color and can be sized with <code className="bg-gray-200 px-1 rounded">w-*</code> and <code className="bg-gray-200 px-1 rounded">h-*</code> classes.
                            </p>
                        </div>
                    </div>

                    {/* Tabs Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tabs</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Settings pages, multi-view interfaces
                        </p>
                        
                        <RadixTabs.Root defaultValue="overview" className="w-full">
                            <RadixTabs.List>
                                <RadixTabs.Trigger value="overview">
                                    Overview
                                </RadixTabs.Trigger>
                                <RadixTabs.Trigger value="analytics">
                                    Analytics
                                </RadixTabs.Trigger>
                                <RadixTabs.Trigger value="settings">
                                    Settings
                                </RadixTabs.Trigger>
                            </RadixTabs.List>
                            <RadixTabs.Content value="overview" className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-700">Overview content goes here</p>
                            </RadixTabs.Content>
                            <RadixTabs.Content value="analytics" className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-700">Analytics content goes here</p>
                            </RadixTabs.Content>
                            <RadixTabs.Content value="settings" className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-700">Settings content goes here</p>
                            </RadixTabs.Content>
                        </RadixTabs.Root>
                    </div>

                    {/* Select Demo */}
                    <div id="select" className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Select</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Model selection, entity selection, status dropdowns
                        </p>
                        
                        <RadixSelect.Root value={selectedModel} onValueChange={setSelectedModel}>
                            <RadixSelect.Trigger 
                                className="min-w-[200px]"
                                placeholder="Select a model..."
                            />

                            <RadixSelect.Content>
                                    <RadixSelect.Group>
                                        <RadixSelect.Label>
                                            OpenAI Models
                                        </RadixSelect.Label>
                                        <RadixSelect.Item value="gpt-4">GPT-4</RadixSelect.Item>
                                        <RadixSelect.Item value="gpt-4-turbo">GPT-4 Turbo</RadixSelect.Item>
                                        <RadixSelect.Item value="gpt-3.5-turbo">GPT-3.5 Turbo</RadixSelect.Item>
                                    </RadixSelect.Group>
                                    <RadixSelect.Separator />
                                    <RadixSelect.Group>
                                        <RadixSelect.Label>
                                            Anthropic Models
                                        </RadixSelect.Label>
                                        <RadixSelect.Item value="claude-3-opus">Claude 3 Opus</RadixSelect.Item>
                                        <RadixSelect.Item value="claude-3-sonnet">Claude 3 Sonnet</RadixSelect.Item>
                                    </RadixSelect.Group>
                            </RadixSelect.Content>
                        </RadixSelect.Root>

                        <p className="mt-4 text-sm text-gray-600">
                            Selected: <span className="font-semibold">{selectedModel}</span>
                        </p>
                    </div>

                    {/* MultiSelect Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Multi Select</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Tagging, filtering, multiple choices
                        </p>

                        <RadixMultiSelect
                            value={selectedCapabilities}
                            onValueChange={setSelectedCapabilities}
                            options={[
                                { value: 'text', label: 'Text Generation' },
                                { value: 'image', label: 'Image Generation' },
                                { value: 'audio', label: 'Audio Processing' },
                                { value: 'code', label: 'Code Completion' },
                                { value: 'analysis', label: 'Data Analysis' }
                            ]}
                            placeholder="Select capabilities..."
                            className="w-[280px]"
                        />
                        <p className="mt-4 text-sm text-gray-600">
                            Selected: <span className="font-semibold">{selectedCapabilities.length > 0 ? selectedCapabilities.join(", ") : "None"}</span>
                        </p>
                    </div>



                    {/* Dropdown Menu Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Dropdown Menu</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Action menus, context menus, user menus
                        </p>

                        <RadixDropdownMenu.Root>
                            {/* @ts-expect-error asChild is supported at runtime but typing is inconsistent */}
                            <RadixDropdownMenu.Trigger asChild>
                                <Button variant="primary">Actions</Button>
                            </RadixDropdownMenu.Trigger>

                            <RadixDropdownMenu.Content>
                                    <RadixDropdownMenu.Item>
                                        Edit Prompt
                                    </RadixDropdownMenu.Item>
                                    <RadixDropdownMenu.Item>
                                        Duplicate
                                    </RadixDropdownMenu.Item>
                                    <RadixDropdownMenu.Separator />
                                    <RadixDropdownMenu.Item className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                        Delete
                                    </RadixDropdownMenu.Item>
                            </RadixDropdownMenu.Content>
                        </RadixDropdownMenu.Root>
                    </div>

                    {/* Dialog Demo */}
                    <div id="interactive" className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Dialog (Modal)</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Confirmation dialogs, forms, detailed views
                        </p>

                        <RadixDialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            {/* @ts-expect-error asChild is supported at runtime but typing is inconsistent */}
                            <RadixDialog.Trigger asChild>
                                <Button variant="primary">Open Dialog</Button>
                            </RadixDialog.Trigger>

                            <RadixDialog.Content>
                                    <RadixDialog.Title className="text-2xl font-bold text-gray-900 mb-2">
                                        Add New Prompt
                                    </RadixDialog.Title>
                                    <RadixDialog.Description className="text-gray-600 mb-6">
                                        Enter the details for your new prompt below.
                                    </RadixDialog.Description>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Prompt Text
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="What is the best CRM?"
                                                className="w-full px-4 py-2 border border-[var(--gray-6)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] focus-visible:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Intent
                                            </label>
                                            <select className="w-full px-4 py-2 border border-[var(--gray-6)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] focus-visible:outline-none">
                                                <option>Informational</option>
                                                <option>Commercial</option>
                                                <option>Transactional</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-8">
                                        {/* @ts-expect-error asChild is supported at runtime but typing is inconsistent */}
                                        <RadixDialog.Close asChild>
                                            <Button variant="tertiary" className="flex-1 justify-center">Cancel</Button>
                                        </RadixDialog.Close>
                                        <Button variant="primary" className="flex-1 justify-center">
                                            Add Prompt
                                        </Button>
                                    </div>
                            </RadixDialog.Content>
                        </RadixDialog.Root>
                    </div>

                    {/* Popover Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Popover</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Filter panels, quick settings, additional info
                        </p>

                        <RadixPopover.Root>
                            <RadixPopover.Trigger asChild>
                                <Button variant="primary">Filter Options</Button>
                            </RadixPopover.Trigger>

                            <RadixPopover.Content
                                sideOffset={5}
                            >
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900">Filter Prompts</h3>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded" />
                                            <span className="text-sm text-gray-700">Active only</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded" />
                                            <span className="text-sm text-gray-700">Has results</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="checkbox" className="rounded" />
                                            <span className="text-sm text-gray-700">Recently updated</span>
                                        </label>
                                    </div>
                                </div>
                            </RadixPopover.Content>
                        </RadixPopover.Root>
                    </div>

                    {/* Switch & Checkbox Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Switch & Checkbox</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Settings toggles, feature flags, selections
                        </p>

                        <div className="space-y-6">
                            {/* Switch */}
                            <div className="flex items-center justify-between">
                                <label htmlFor="enable-notifications" className="text-sm font-medium text-gray-700">
                                    Enable Notifications
                                </label>
                                <RadixSwitch.Root
                                    id="enable-notifications"
                                    checked={isEnabled}
                                    onCheckedChange={setIsEnabled}
                                    className="transition-colors"
                                />
                            </div>

                            {/* Checkbox */}
                            <div className="flex items-center gap-3">
                                <RadixCheckbox.Root
                                    id="agree"
                                    checked={isChecked}
                                    onCheckedChange={(checked) => setIsChecked(checked === true)}
                                />
                                <label htmlFor="agree" className="text-sm text-gray-700">
                                    I agree to the terms and conditions
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Toggle & Toggle Group Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Toggle & Toggle Group</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Toolbar buttons, view switchers, filter groups
                        </p>

                        <div className="space-y-8">
                            {/* Single Toggle */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Single Toggle</h3>
                                <RadixToggle.Root
                                    className="p-2 rounded hover:bg-gray-100 data-[state=on]:bg-gray-200 data-[state=on]:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    aria-label="Toggle italic"
                                >
                                    <FontItalicIcon className="w-5 h-5" />
                                </RadixToggle.Root>
                                <p className="mt-2 text-xs text-gray-500">Click to toggle italic state</p>
                            </div>

                            {/* Toggle Group (Single Selection) */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Toggle Group (Single - View Switcher)</h3>
                                <RadixToggleGroup.Root
                                    type="single"
                                    defaultValue="list"
                                    aria-label="View mode"
                                    className="inline-flex bg-gray-100 rounded-lg p-1"
                                >
                                    <RadixToggleGroup.Item
                                        value="list"
                                        aria-label="List view"
                                        className="p-2 rounded text-gray-500 hover:text-gray-900 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm focus:outline-none"
                                    >
                                        <ViewHorizontalIcon className="w-5 h-5" />
                                    </RadixToggleGroup.Item>
                                    <RadixToggleGroup.Item
                                        value="grid"
                                        aria-label="Grid view"
                                        className="p-2 rounded text-gray-500 hover:text-gray-900 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm focus:outline-none"
                                    >
                                        <ViewGridIcon className="w-5 h-5" />
                                    </RadixToggleGroup.Item>
                                </RadixToggleGroup.Root>
                            </div>

                            {/* Toggle Group (Multiple Selection) */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Toggle Group (Multiple - Text Formatting)</h3>
                                <RadixToggleGroup.Root
                                    type="multiple"
                                    defaultValue={['bold']}
                                    aria-label="Text formatting"
                                    className="inline-flex bg-white border border-gray-200 rounded-lg p-1 gap-1"
                                >
                                    <RadixToggleGroup.Item
                                        value="bold"
                                        aria-label="Bold"
                                        className="p-2 rounded hover:bg-gray-50 data-[state=on]:bg-gray-100 data-[state=on]:text-gray-900 focus:outline-none"
                                    >
                                        <FontBoldIcon className="w-4 h-4" />
                                    </RadixToggleGroup.Item>
                                    <RadixToggleGroup.Item
                                        value="italic"
                                        aria-label="Italic"
                                        className="p-2 rounded hover:bg-gray-50 data-[state=on]:bg-gray-100 data-[state=on]:text-gray-900 focus:outline-none"
                                    >
                                        <FontItalicIcon className="w-4 h-4" />
                                    </RadixToggleGroup.Item>
                                    <RadixToggleGroup.Item
                                        value="underline"
                                        aria-label="Underline"
                                        className="p-2 rounded hover:bg-gray-50 data-[state=on]:bg-gray-100 data-[state=on]:text-gray-900 focus:outline-none"
                                    >
                                        <UnderlineIcon className="w-4 h-4" />
                                    </RadixToggleGroup.Item>
                                </RadixToggleGroup.Root>
                            </div>

                            {/* Segmented Control */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Segmented Control</h3>
                                <RadixSegmentedControl
                                    value={frequency}
                                    onValueChange={setFrequency}
                                    items={[
                                        { value: 'daily', label: 'Daily' },
                                        { value: 'weekly', label: 'Weekly' },
                                        { value: 'monthly', label: 'Monthly' }
                                    ]}
                                    className="w-full max-w-[300px]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tooltip Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Tooltip</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Help text, additional context, icon explanations
                        </p>

                        <Tooltip content="This is a helpful tooltip!">
                            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                                Hover me
                            </button>
                        </Tooltip>
                    </div>

                    {/* Accordion Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Accordion</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: FAQs, collapsible sections, settings groups
                        </p>

                        <RadixAccordion.Root type="single" collapsible className="space-y-2">
                            <RadixAccordion.Item value="item-1">
                                <RadixAccordion.Trigger>
                                    What models are supported?
                                </RadixAccordion.Trigger>
                                <RadixAccordion.Content>
                                    We support GPT-4, GPT-3.5, Claude 3, and other major LLM providers.
                                </RadixAccordion.Content>
                            </RadixAccordion.Item>

                            <RadixAccordion.Item value="item-2">
                                <RadixAccordion.Trigger>
                                    How often are prompts analyzed?
                                </RadixAccordion.Trigger>
                                <RadixAccordion.Content>
                                    Prompts are analyzed daily by default, but you can configure custom schedules.
                                </RadixAccordion.Content>
                            </RadixAccordion.Item>

                            <RadixAccordion.Item value="item-3">
                                <RadixAccordion.Trigger>
                                    Can I export my data?
                                </RadixAccordion.Trigger>
                                <RadixAccordion.Content>
                                    Yes, you can export all your data in CSV or JSON format at any time.
                                </RadixAccordion.Content>
                            </RadixAccordion.Item>
                        </RadixAccordion.Root>
                    </div>

                    {/* Radio Group Demo */}
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Radio Group</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Intent selection, plan selection, single-choice options
                        </p>

                        <RadioGroupPrimitive.Root defaultValue="informational" className="space-y-3">
                            <div className="flex items-center gap-3">
                                <RadioGroupPrimitive.Item
                                    value="informational"
                                    id="r1"
                                    className="w-5 h-5 rounded-full border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <RadioGroupPrimitive.Indicator className="w-2 h-2 rounded-full bg-white" />
                                </RadioGroupPrimitive.Item>
                                <label className="text-sm font-medium text-gray-700" htmlFor="r1">
                                    Informational
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <RadioGroupPrimitive.Item
                                    value="navigational"
                                    id="r2"
                                    className="w-5 h-5 rounded-full border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <RadioGroupPrimitive.Indicator className="w-2 h-2 rounded-full bg-white" />
                                </RadioGroupPrimitive.Item>
                                <label className="text-sm font-medium text-gray-700" htmlFor="r2">
                                    Navigational
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <RadioGroupPrimitive.Item
                                    value="transactional"
                                    id="r3"
                                    className="w-5 h-5 rounded-full border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <RadioGroupPrimitive.Indicator className="w-2 h-2 rounded-full bg-white" />
                                </RadioGroupPrimitive.Item>
                                <label className="text-sm font-medium text-gray-700" htmlFor="r3">
                                    Transactional
                                </label>
                            </div>
                        </RadioGroupPrimitive.Root>
                    </div>

                    {/* Slider Demo */}
                    <div className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Slider</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Volume controls, price ranges, confidence thresholds
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Analysis Frequency (days)
                                </label>
                                <RadixSlider.Root
                                    defaultValue={[7]}
                                    max={30}
                                    step={1}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Price Range ($)
                                </label>
                                <RadixSlider.Root
                                    defaultValue={[25, 75]}
                                    max={100}
                                    step={5}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Progress Demo */}
                    <div className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Progress</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Analysis progress, upload status, loading indicators
                        </p>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Analyzing prompts...</span>
                                    <span>66%</span>
                                </div>
                                <RadixProgress.Root value={66} />
                            </div>

                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-2">
                                    <span>Processing results...</span>
                                    <span>100%</span>
                                </div>
                                <RadixProgress.Root value={100} className="bg-gray-200">
                                    {/* Override indicator color via className if supported, or style */}
                                </RadixProgress.Root>
                            </div>
                        </div>
                    </div>

                    {/* Separator Demo */}
                    <div className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Separator</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Visual dividers, section breaks, menu separators
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-700">Section 1</span>
                                <RadixSeparator.Root className="flex-1" />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700">Left content</p>
                                </div>
                                <RadixSeparator.Root orientation="vertical" />
                                <div className="flex-1 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700">Right content</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Context Menu Demo */}
                    <div className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Context Menu</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Right-click actions, table row actions, card actions
                        </p>

                        <ContextMenu.Root>
                            <ContextMenu.Trigger className="block p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600">
                                Right-click here to see context menu
                            </ContextMenu.Trigger>

                            <ContextMenu.Portal>
                                <ContextMenu.Content className="min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
                                    <ContextMenu.Item className="px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 focus:bg-gray-100 outline-none cursor-pointer">
                                        View Details
                                    </ContextMenu.Item>
                                    <ContextMenu.Item className="px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 focus:bg-gray-100 outline-none cursor-pointer">
                                        Edit
                                    </ContextMenu.Item>
                                    <ContextMenu.Item className="px-3 py-2 text-sm text-gray-700 rounded hover:bg-gray-100 focus:bg-gray-100 outline-none cursor-pointer">
                                        Duplicate
                                    </ContextMenu.Item>
                                    <ContextMenu.Separator className="h-px bg-gray-200 my-2" />
                                    <ContextMenu.Item className="px-3 py-2 text-sm text-red-600 rounded hover:bg-red-50 focus:bg-red-50 outline-none cursor-pointer">
                                        Delete
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                    </div>

                    {/* Alert Dialog Demo */}
                    <div className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Alert Dialog</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Perfect for: Destructive actions, confirmations, critical alerts
                        </p>

                        <AlertDialog.Root>
                            <AlertDialog.Trigger asChild>
                                <Button variant="danger">Delete Prompt</Button>
                            </AlertDialog.Trigger>

                            <AlertDialog.Portal>
                                <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                                <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl p-8 max-w-md w-full z-50">
                                    <AlertDialog.Title className="text-2xl font-bold text-gray-900 mb-2">
                                        Are you absolutely sure?
                                    </AlertDialog.Title>
                                    <AlertDialog.Description className="text-gray-600 mb-6">
                                        This action cannot be undone. This will permanently delete the prompt
                                        and all associated analysis data.
                                    </AlertDialog.Description>

                                    <div className="flex gap-3">
                                        <AlertDialog.Cancel asChild>
                                            <Button variant="tertiary" className="flex-1 justify-center">Cancel</Button>
                                        </AlertDialog.Cancel>
                                        <AlertDialog.Action asChild>
                                            <Button variant="danger" className="flex-1 justify-center">Yes, delete prompt</Button>
                                        </AlertDialog.Action>
                                    </div>
                                </AlertDialog.Content>
                            </AlertDialog.Portal>
                        </AlertDialog.Root>
                    </div>

                            <RadixTabs.Content value="table" className="focus:outline-none">
                                <div className="space-y-12">
                                    {/* Table Style Selector */}
                                    <div className="bg-white rounded-2xl border border-gray-200 p-8">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Table Visual Styles</h3>
                                        <RadioGroup.Root 
                                            value={tableVariant} 
                                            onValueChange={(val) => setTableVariant(val as "surface" | "ghost")}
                                            className="flex gap-8"
                                        >
                                            <Flex gap="2" align="center">
                                                <RadioGroup.Item value="surface" id="variant-surface" />
                                                <label htmlFor="variant-surface" className="text-sm font-medium cursor-pointer">Surface (Default)</label>
                                            </Flex>
                                            <Flex gap="2" align="center">
                                                <RadioGroup.Item value="ghost" id="variant-ghost" />
                                                <label htmlFor="variant-ghost" className="text-sm font-medium cursor-pointer">Ghost</label>
                                            </Flex>
                                        </RadioGroup.Root>
                                    </div>

                                    <div className="space-y-12">
                                    {/* Table Demo */}
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Standard Variation</h3>
                                        <div id="table" className="rounded-2xl border border-gray-200 bg-white p-8 space-y-8 scroll-mt-24">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Table</h2>
                                                    <p className="text-gray-500">
                                                        A sortable data table built with Radix-like compound components.
                                                        Click headers to sort.
                                                    </p>
                                                </div>
                                                <Badge size="2" color="blue" variant="soft">Standard</Badge>
                                            </div>
                                            <TableDemo data={initialInvoices} variant={tableVariant} />
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Senior Layout patterns</h3>
                                        <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-8">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Metric Alignment & Separators</h2>
                                                <p className="text-gray-500">
                                                    Demonstrating right-alignment for metrics and vertical grouping with <code className="bg-gray-100 px-1 rounded">border-l</code>.
                                                </p>
                                            </div>
                                            <MetricTableDemo variant={tableVariant} />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Interactive actions</h3>
                                        <div className="rounded-2xl border border-gray-200 bg-white p-8 space-y-8">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Action Table</h2>
                                                <p className="text-gray-500">
                                                    Incorporating buttons, status badges, and dropdown menus within table cells.
                                                </p>
                                            </div>
                                            <ActionTableDemo variant={tableVariant} />
                                        </div>
                                    </div>

                                    <div className="space-y-6 border-t border-gray-100 pt-12">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Expandable Rows pattern</h3>
                                        <p className="text-sm text-[var(--gray-11)] mb-4">
                                            Use <code className="bg-gray-200 px-1 rounded">RadixTable.ExpandableRow</code> and <code className="bg-gray-200 px-1 rounded">RadixTable.ExpandedContent</code> to nest additional complex data directly inside table rows.
                                        </p>
                                        <div className="border border-[var(--gray-6)] rounded-lg overflow-hidden bg-white">
                                            <RadixTable.Root variant={tableVariant}>
                                                <RadixTable.Header>
                                                    <RadixTable.Row>
                                                        <RadixTable.Head>Brand Name</RadixTable.Head>
                                                        <RadixTable.Head>Category</RadixTable.Head>
                                                        <RadixTable.Head>Status</RadixTable.Head>
                                                    </RadixTable.Row>
                                                </RadixTable.Header>
                                                <RadixTable.Body>
                                                    <RadixTable.ExpandableRow 
                                                        isExpanded={demoExpandedRow} 
                                                        onToggle={() => setDemoExpandedRow(!demoExpandedRow)}
                                                    >
                                                        <RadixTable.Cell className="font-medium text-gray-900">TechCorp Inc.</RadixTable.Cell>
                                                        <RadixTable.Cell>Enterprise SaaS</RadixTable.Cell>
                                                        <RadixTable.Cell>
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Active
                                                            </span>
                                                        </RadixTable.Cell>
                                                    </RadixTable.ExpandableRow>
                                                    <RadixTable.ExpandedContent colSpan={4} isExpanded={demoExpandedRow}>
                                                        <div className="p-6 grid grid-cols-2 gap-8">
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wider mb-2">
                                                                    Competitors Tracked
                                                                </h4>
                                                                <ul className="space-y-2">
                                                                    <li className="text-sm px-2 py-1 bg-white border border-[var(--gray-4)] rounded">InnovateSoft</li>
                                                                    <li className="text-sm px-2 py-1 bg-white border border-[var(--gray-4)] rounded">GlobalTech Solutions</li>
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wider mb-2">
                                                                    Recent Activity
                                                                </h4>
                                                                <ul className="space-y-1 text-sm text-[var(--gray-11)]">
                                                                    <li><span className="text-[var(--gray-12)] font-medium">Added new prompt:</span> &quot;What are the alternatives to...&quot;</li>
                                                                    <li><span className="text-[var(--gray-12)] font-medium">Analyzed:</span> 145 results yesterday</li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </RadixTable.ExpandedContent>
                                                    <RadixTable.Row>
                                                        <RadixTable.Cell className="font-medium text-gray-900">StartUp io</RadixTable.Cell>
                                                        <RadixTable.Cell>Consumer App</RadixTable.Cell>
                                                        <RadixTable.Cell>
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                                Paused
                                                            </span>
                                                        </RadixTable.Cell>
                                                    </RadixTable.Row>
                                                </RadixTable.Body>
                                            </RadixTable.Root>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </RadixTabs.Content>

                            <RadixTabs.Content value="toast" className="focus:outline-none">
                                {/* Implementation Notes */}
                                <div 
                                    className="rounded-2xl p-8 border mb-8"
                                    style={{ 
                                        backgroundColor: 'var(--accent-2)', 
                                        borderColor: 'var(--accent-6)' 
                                    }}
                                >
                                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent-12)' }}>Implementation Notes</h2>
                                    <ul className="space-y-2 text-sm" style={{ color: 'var(--accent-11)' }}>
                                        <li>✅ All components are fully accessible (WCAG compliant)</li>
                                        <li>✅ Keyboard navigation works out of the box</li>
                                        <li>✅ Portal rendering prevents z-index issues</li>
                                        <li>✅ Fully customizable with Tailwind CSS</li>
                                        <li>✅ Tree-shakeable - only import what you need</li>
                                        <li>⚠️ Gradually migrate existing components to avoid breaking changes</li>
                                    </ul>
                                </div>

                                <ToastDemo />
                            </RadixTabs.Content>
                        </div>
                    </RadixTabs.Root>
                </div>
            </div>
    );
}

// Helper component for Select items
// SelectItem helper removed as it's replaced by RadixSelect.Item which is already styled

// Helper component for Icon showcase
function IconBox({ icon, label, color = "text-gray-700" }: { icon: React.ReactNode; label: string; color?: string }) {
    return (
        <div className="group relative flex flex-col items-center gap-1">
            <div className={`p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${color}`}>
                <div className="w-5 h-5 flex items-center justify-center">
                    {icon}
                </div>
            </div>
            <span className="text-[10px] text-gray-500 group-hover:text-gray-700 transition-colors">
                {label}
            </span>
        </div>
    );
}

// Helper component for Color swatches
function ColorSwatch({ color, label, dark = false }: { color: string; label: string; dark?: boolean }) {
    return (
        <div className="flex flex-col items-center">
            <div 
                className="w-full aspect-square rounded-md border border-gray-200"
                style={{ backgroundColor: color }}
            />
            <span className={`text-[9px] mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {label}
            </span>
        </div>
    );
}

// Table Demo Data
const initialInvoices = [
    {
        invoice: "INV001",
        paymentStatus: "Paid",
        totalAmount: "$250.00",
        paymentMethod: "Credit Card",
    },
    {
        invoice: "INV002",
        paymentStatus: "Pending",
        totalAmount: "$150.00",
        paymentMethod: "PayPal",
    },
    {
        invoice: "INV003",
        paymentStatus: "Unpaid",
        totalAmount: "$350.00",
        paymentMethod: "Bank Transfer",
    },
    {
        invoice: "INV004",
        paymentStatus: "Paid",
        totalAmount: "$450.00",
        paymentMethod: "Credit Card",
    },
    {
        invoice: "INV005",
        paymentStatus: "Paid",
        totalAmount: "$550.00",
        paymentMethod: "PayPal",
    },
    {
        invoice: "INV006",
        paymentStatus: "Pending",
        totalAmount: "$200.00",
        paymentMethod: "Bank Transfer",
    },
    {
        invoice: "INV007",
        paymentStatus: "Unpaid",
        totalAmount: "$300.00",
        paymentMethod: "Credit Card",
    },
];


function TableDemo({ data, variant = "surface" }: { data: typeof initialInvoices, variant?: "surface" | "ghost" }) {
    const [invoices, setInvoices] = useState(data);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        
        const sortedInvoices = [...invoices].sort((a, b) => {
            // @ts-expect-error - dynamic key access
            if (a[key] < b[key]) {
                return direction === 'asc' ? -1 : 1;
            }
            // @ts-expect-error - dynamic key access for sorting
            if (a[key] > b[key]) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        setInvoices(sortedInvoices);
    };

    return (
        <RadixTable.Root variant={variant}>
            <RadixTable.Caption>A list of your recent invoices.</RadixTable.Caption>
            <RadixTable.Header>
                <RadixTable.Row>
                    <RadixTable.SortableHead 
                        label="Invoice"
                        sortKey="invoice"
                        currentSortKey={sortConfig?.key}
                        sortDirection={sortConfig?.direction}
                        onSort={handleSort}
                        className="w-[100px]"
                    />
                    <RadixTable.SortableHead 
                        label="Status"
                        sortKey="paymentStatus"
                        currentSortKey={sortConfig?.key}
                        sortDirection={sortConfig?.direction}
                        onSort={handleSort}
                    />
                    <RadixTable.Head>Method</RadixTable.Head>
                    <RadixTable.SortableHead 
                        label="Amount"
                        sortKey="totalAmount"
                        currentSortKey={sortConfig?.key}
                        sortDirection={sortConfig?.direction}
                        onSort={handleSort}
                        className="text-right justify-end"
                        justify="end"
                    />
                </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
                {invoices.map((invoice) => (
                    <RadixTable.Row key={invoice.invoice}>
                        <RadixTable.Cell className="font-medium">{invoice.invoice}</RadixTable.Cell>
                        <RadixTable.Cell>{invoice.paymentStatus}</RadixTable.Cell>
                        <RadixTable.Cell>{invoice.paymentMethod}</RadixTable.Cell>
                        <RadixTable.Cell className="text-right">{invoice.totalAmount}</RadixTable.Cell>
                    </RadixTable.Row>
                ))}
            </RadixTable.Body>
            <RadixTable.Footer>
                <RadixTable.Row>
                    <RadixTable.Cell colSpan={3}>Total</RadixTable.Cell>
                    <RadixTable.Cell className="text-right">$2,500.00</RadixTable.Cell>
                </RadixTable.Row>
            </RadixTable.Footer>
        </RadixTable.Root>
    )
}

function MetricTableDemo({ variant = "surface" }: { variant?: "surface" | "ghost" }) {
    return (
        <RadixTable.Root variant={variant}>
            <RadixTable.Header>
                <RadixTable.Row>
                    <RadixTable.Head>Entity</RadixTable.Head>
                    <RadixTable.Head 
                        justify="end" 
                        className="border-l border-[var(--gray-5)] pl-6"
                    >
                        Mention Rate
                    </RadixTable.Head>
                    <RadixTable.Head justify="end">Avg. Position</RadixTable.Head>
                    <RadixTable.Head 
                        justify="end"
                        className="border-l border-[var(--gray-5)] pl-6"
                    >
                        SOV
                    </RadixTable.Head>
                </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
                {[
                    { name: 'Apple', rate: '45.2%', pos: '1.2', sov: '32.1%' },
                    { name: 'Samsung', rate: '38.5%', pos: '1.8', sov: '28.4%' },
                    { name: 'Google', rate: '29.1%', pos: '2.4', sov: '15.2%' },
                ].map((row) => (
                    <RadixTable.Row key={row.name}>
                        <RadixTable.Cell className="font-medium">{row.name}</RadixTable.Cell>
                        <RadixTable.Cell className="text-right border-l border-[var(--gray-4)] pl-6">
                            <div className="flex justify-end">{row.rate}</div>
                        </RadixTable.Cell>
                        <RadixTable.Cell className="text-right">
                            <div className="flex justify-end">{row.pos}</div>
                        </RadixTable.Cell>
                        <RadixTable.Cell className="text-right border-l border-[var(--gray-4)] pl-6">
                            <div className="flex justify-end">{row.sov}</div>
                        </RadixTable.Cell>
                    </RadixTable.Row>
                ))}
            </RadixTable.Body>
        </RadixTable.Root>
    )
}

function ActionTableDemo({ variant = "surface" }: { variant?: "surface" | "ghost" }) {
    return (
        <RadixTable.Root variant={variant}>
            <RadixTable.Header>
                <RadixTable.Row>
                    <RadixTable.Head>Project</RadixTable.Head>
                    <RadixTable.Head>Status</RadixTable.Head>
                    <RadixTable.Head>Last Run</RadixTable.Head>
                    <RadixTable.Head justify="end">Actions</RadixTable.Head>
                </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
                {[
                    { id: 1, name: 'Brand Audit Q1', status: 'completed', date: '2 hours ago' },
                    { id: 2, name: 'Competitor Scan', status: 'running', date: '5 mins ago' },
                    { id: 3, name: 'Market Analysis', status: 'failed', date: '1 day ago' },
                ].map((row) => (
                    <RadixTable.Row key={row.id}>
                        <RadixTable.Cell className="font-medium">{row.name}</RadixTable.Cell>
                        <RadixTable.Cell>
                            <Badge 
                                color={row.status === 'completed' ? 'green' : row.status === 'running' ? 'blue' : 'red'} 
                                variant="soft"
                                size="1"
                            >
                                {row.status.toUpperCase()}
                            </Badge>
                        </RadixTable.Cell>
                        <RadixTable.Cell className="text-gray-500 text-sm">{row.date}</RadixTable.Cell>
                        <RadixTable.Cell>
                            <div className="flex justify-end gap-2">
                                <Button variant="secondary" size="xs">View</Button>
                                <RadixDropdownMenu.Root>
                                    {/* @ts-expect-error asChild is supported at runtime but typing is inconsistent */}
                                    <RadixDropdownMenu.Trigger asChild>
                                        <Button variant="tertiary" size="xs">
                                            <DotsHorizontalIcon />
                                        </Button>
                                    </RadixDropdownMenu.Trigger>
                                    <RadixDropdownMenu.Content align="end">
                                        <RadixDropdownMenu.Item>Edit</RadixDropdownMenu.Item>
                                        <RadixDropdownMenu.Item>Duplicate</RadixDropdownMenu.Item>
                                        <RadixDropdownMenu.Separator />
                                        <RadixDropdownMenu.Item color="red">Delete</RadixDropdownMenu.Item>
                                    </RadixDropdownMenu.Content>
                                </RadixDropdownMenu.Root>
                            </div>
                        </RadixTable.Cell>
                    </RadixTable.Row>
                ))}
            </RadixTable.Body>
        </RadixTable.Root>
    )
}

function ToastDemo() {
    const { success, error, info, warning } = useToast();

    return (
        <div id="toast" className="mb-6 bg-white rounded-2xl shadow-sm p-8 border border-gray-200 scroll-mt-24">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Toast Notifications</h2>
            <p className="text-sm text-gray-600 mb-6">
                Non-blocking notifications for success, error, and system messages.
            </p>

            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                    <Button 
                        variant="primary" 
                        onClick={() => success("Success!", "Your changes have been saved successfully.")}
                    >
                        Trigger Success
                    </Button>
                    <Button 
                        variant="danger" 
                        onClick={() => error("Error Occurred", "Something went wrong. Please try again.")}
                    >
                        Trigger Error
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => info("New Update", "Spectacl has been updated to version 2.0.")}
                    >
                        Trigger Info
                    </Button>
                    <Button 
                        variant="tertiary" 
                        onClick={() => warning("Warning", "Your subscription is expiring soon.")}
                    >
                        Trigger Warning
                    </Button>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                        <strong>Usage:</strong> Use the <code className="bg-gray-200 px-1 rounded">useToast()</code> hook.
                    </p>
                    <pre className="mt-2 text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
{`const { success, error } = useToast();

// Trigger a toast
success("Title", "Description");`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
