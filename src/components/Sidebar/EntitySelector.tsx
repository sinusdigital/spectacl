"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, ChevronDownIcon, CheckIcon, GearIcon } from "@radix-ui/react-icons";
import BuildingIcon from "@/components/Icons/BuildingIcon";
import { Entity } from "@/types/entity";
import CompanyLogo from "@/components/CompanyLogo";
import { SpaceIcon } from "@/components/Shared/SpaceIcon";
import { DropdownMenu, Separator, Text, Tooltip } from "@radix-ui/themes";

interface EntitySelectorProps {
    currentEntity: Entity | null;
    entities: Entity[];
    currentSpace: {
        id: string;
        name: string;
        logo?: string | null;
    } | null;
    hasMultipleSpaces: boolean;
    onNavigate?: () => void;
}

export default function EntitySelector({
    currentEntity,
    entities,
    currentSpace,
    hasMultipleSpaces,
    onNavigate,
}: EntitySelectorProps) {
    const activeEntities = entities.filter(e => !e.isArchived);
    const entityCount = activeEntities.length;

    return (
        <div
            style={{
                flexShrink: 0,
                height: "var(--header-h)",
                padding: "0 var(--space-2)",
                backgroundColor: "var(--gray-3)",
                borderBottom: "1px solid var(--gray-a4)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                overflow: "hidden",
            }}
        >
                {/* Space icon — clickable to /spaces */}
                <SpaceButton currentSpace={currentSpace} hasMultipleSpaces={hasMultipleSpaces} onNavigate={onNavigate} />

                {/* Vertical divider */}
                <Separator orientation="vertical" size="1" style={{ backgroundColor: "var(--gray-a5)", height: 24 }} />

                {/* Entity area — fills remaining space */}
                <div style={{ flex: 1, minWidth: 0, overflow: "visible", display: "flex", alignItems: "center" }}>
                    {entityCount === 0
                        ? <CreateEntityCTA onNavigate={onNavigate} />
                        : <EntityDropdown entities={activeEntities} currentEntity={currentEntity} onNavigate={onNavigate} />
                    }
                </div>
        </div>
    );
}

// ── Space Button ─────────────────────────────────────────────────────────────

function SpaceButton({
    currentSpace,
    hasMultipleSpaces,
    onNavigate,
}: {
    currentSpace: EntitySelectorProps["currentSpace"];
    hasMultipleSpaces: boolean;
    onNavigate?: () => void;
}) {
    return (
        <Tooltip content={currentSpace?.name || "Workspace"}>
            <Link
                href="/spaces"
                onClick={() => onNavigate?.()}
                className="shrink-0 rounded-lg p-1 hover:bg-[var(--gray-a3)] transition-colors"
                aria-label={currentSpace?.name || "Workspace"}
            >
                <SpaceIcon size="sm" hasMultipleSpaces={hasMultipleSpaces} />
            </Link>
        </Tooltip>
    );
}

// ── 0 entities: Create CTA ──────────────────────────────────────────────────

function CreateEntityCTA({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <Link
            href="/entities?create=true"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--gray-a3)] transition-colors min-w-0"
        >
            <PlusIcon className="w-4 h-4 text-[var(--gray-8)] shrink-0" />
            <Text size="2" weight="medium" className="truncate" style={{ color: "var(--gray-11)" }}>
                Create First Entity
            </Text>
        </Link>
    );
}

// ── 1+ entities: Dropdown selector ──────────────────────────────────────────

function EntityDropdown({
    entities,
    currentEntity,
    onNavigate,
}: {
    entities: Entity[];
    currentEntity: Entity | null;
    onNavigate?: () => void;
}) {
    const router = useRouter();
    const displayed = currentEntity ?? entities[0];

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <button
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--gray-a3)] transition-colors min-w-0 flex-1 group focus:outline-none"
                >
                    {displayed && (
                        <CompanyLogo
                            domain={displayed.website}
                            name={displayed.name}
                            size={24}
                            radius="medium"
                            logoUrl={displayed.logoUrl}
                        />
                    )}
                    <Text size="2" weight="medium" className="truncate flex-1 text-left">
                        {displayed?.name ?? "Select Entity"}
                    </Text>
                    <ChevronDownIcon
                        className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity duration-150"
                        style={{ color: "var(--gray-11)" }}
                    />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content
                align="start"
                sideOffset={4}
                style={{ minWidth: 200, zIndex: 200 }}
            >
                {entities.map((entity) => {
                    const isActive = entity.id === currentEntity?.id;
                    return (
                        <DropdownMenu.Item
                            key={entity.id}
                            onClick={() => { router.push(`/${entity.id}`); onNavigate?.(); }}
                        >
                            <CompanyLogo
                                domain={entity.website}
                                name={entity.name}
                                size={20}
                                radius="medium"
                                logoUrl={entity.logoUrl}
                            />
                            <span className="truncate flex-1">{entity.name}</span>
                            {isActive && (
                                <CheckIcon className="w-4 h-4 shrink-0" style={{ color: "var(--accent-9)" }} />
                            )}
                        </DropdownMenu.Item>
                    );
                })}

                <DropdownMenu.Separator />

                <DropdownMenu.Item
                    onClick={() => { router.push("/entities"); onNavigate?.(); }}
                >
                    <GearIcon />
                    Manage Entities
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onClick={() => { router.push("/spaces"); onNavigate?.(); }}
                >
                    <BuildingIcon className="w-4 h-4" />
                    Manage Spaces
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
}
