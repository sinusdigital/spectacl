import NavListItem from "@/components/Shared/NavListItem";

interface NavigationItemProps {
    name: string | React.ReactNode;
    href: string;
    icon?: React.ReactNode;
    isExactActive: boolean;
    isGroupActive: boolean;
    subItems?: { name: string; href: string }[];
    currentPath: string;
    target?: string;
    onNavigate?: () => void;
}

export default function NavigationItem({
    name,
    href,
    icon,
    isExactActive,
    isGroupActive,
    subItems,
    currentPath,
    target,
    onNavigate
}: NavigationItemProps) {
    return (
        <div>
            <NavListItem
                name={name}
                href={href}
                target={target}
                icon={icon}
                isActive={isExactActive}
                isSubactive={isGroupActive}
                hasSubItems={!!subItems}
                onNavigate={onNavigate}
            />

            {/* Sub-navigation */}
            {subItems && isGroupActive && (
                <div className="ml-[26px] mt-0.5 mb-1 space-y-px border-l border-[var(--gray-a4)] pl-2.5">
                    {subItems.map(child => (
                        <NavListItem
                            key={child.name}
                            name={child.name}
                            href={child.href}
                            isActive={currentPath === child.href}
                            size="sm"
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
