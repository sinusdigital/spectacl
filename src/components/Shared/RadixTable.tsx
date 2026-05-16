import * as React from "react";
import { Table, ScrollArea, Flex, Text, Button, Link } from "@radix-ui/themes";
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon } from "@radix-ui/react-icons";
import { TYPOGRAPHY } from "@/styles/design-tokens";
import { cn } from "@/lib/utils";

// Basic Table Components mimicking Radix Themes/shadcn/ui
interface RootProps extends React.ComponentPropsWithoutRef<typeof Table.Root> {
    scrollable?: boolean;
    maxHeight?: string | number;
}

const Root = React.forwardRef<HTMLDivElement, RootProps>(
    ({ className, children, variant = "surface", scrollable, maxHeight, ...props }, ref) => {
        const table = (
            <Table.Root 
                variant={variant} 
                className={`w-full ${className || ''}`}
                {...props}
            >
                {children}
            </Table.Root>
        );

        if (scrollable) {
            return (
                <ScrollArea scrollbars="vertical" style={{ maxHeight }} ref={ref}>
                    {table}
                </ScrollArea>
            );
        }

        return table;
    }
);
Root.displayName = "Table.Root";

const Header = Table.Header;
const Body = Table.Body;

const Footer = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={`border-t border-[var(--gray-6)] bg-[var(--gray-2)] font-medium [&>tr]:last:border-b-0 ${className || ''}`}
        {...props}
    />
));
Footer.displayName = "Table.Footer";

const Row = Table.Row;

const Cell = React.forwardRef<
    HTMLTableCellElement,
    React.ComponentPropsWithoutRef<typeof Table.Cell>
>(({ className, ...props }, ref) => (
    <Table.Cell ref={ref} className={className} {...props} />
));
Cell.displayName = "Table.Cell";

interface HeadProps extends React.ComponentPropsWithoutRef<typeof Table.ColumnHeaderCell> {
    variant?: 'default' | 'modal';
}

const Head = React.forwardRef<HTMLTableCellElement, HeadProps>(
    ({ className, variant = 'modal', justify, ...props }, ref) => {
        return (
            <Table.ColumnHeaderCell 
                ref={ref} 
                className={
                    variant === 'modal' 
                        ? `!p-0 h-[44px] ${className || ''}`
                        : className
                } 
                {...props} 
            >
                <Flex 
                    align="center" 
                    px="3" 
                    className={cn(
                        "h-full",
                        justify === 'end' ? 'justify-end' : justify === 'center' ? 'justify-center' : 'justify-start',
                        variant === 'modal' ? TYPOGRAPHY.SECTION_LABEL.modal : ''
                    )}
                >
                    {props.children}
                </Flex>
            </Table.ColumnHeaderCell>
        );
    }
);
Head.displayName = "Table.Head";

// Sorting Header Helper
interface SortableHeadProps extends React.ComponentPropsWithoutRef<typeof Table.ColumnHeaderCell> {
    sortKey?: string;
    label: string;
    currentSortKey?: string | null;
    sortDirection?: 'asc' | 'desc' | null;
    variant?: 'default' | 'modal';
    onSort?: (key: string) => void;
}

const SortableHead = React.forwardRef<HTMLTableCellElement, SortableHeadProps>(
    ({ className, sortKey, label, currentSortKey, sortDirection, variant = 'modal', onSort, justify, ...props }, ref) => {
        const isSorted = currentSortKey === sortKey;
        const icon = isSorted 
            ? (sortDirection === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />)
            : null;

        const baseTypographyKeys = variant === 'modal' 
            ? TYPOGRAPHY.SECTION_LABEL.modal
            : "";

        return (
            <Table.ColumnHeaderCell 
                ref={ref}
                className={`!p-0 h-[44px] cursor-pointer select-none group ${className || ''}`}
                onClick={() => sortKey && onSort?.(sortKey)}
                justify={justify}
                {...props}
            >
                <Flex 
                    align="center" 
                    px="3" 
                    gap="1"
                    className={cn(
                        "h-full transition-colors hover:text-[var(--gray-12)]",
                        justify === 'end' ? 'justify-end' : justify === 'center' ? 'justify-center' : 'justify-start',
                        baseTypographyKeys
                    )}
                >
                    {label}
                    {icon && <Text as="span" className="text-[var(--gray-11)]">{icon}</Text>}
                </Flex>
            </Table.ColumnHeaderCell>
        );
    }
);
SortableHead.displayName = "Table.SortableHead";

const Caption = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={`mt-4 text-sm text-[var(--gray-11)] px-1 ${className || ''}`}
        {...props}
    />
));
Caption.displayName = "Table.Caption";

const ExpandableRow = React.forwardRef<
    HTMLTableRowElement,
    React.ComponentPropsWithoutRef<typeof Table.Row> & { isExpanded: boolean; onToggle: () => void }
>(({ className, isExpanded, onToggle, children, ...props }, ref) => {
    // We clone the first child (first Cell) to inject the chevron if it's a Cell
    const childrenArray = React.Children.toArray(children);
    
    // Auto-inject chevron to the left of the content in the first cell if it's a Cell component
    const firstChild = childrenArray[0] as React.ReactElement;
    const isFirstChildCell = firstChild && typeof firstChild.type !== 'string' && (firstChild.type as React.ComponentType).displayName === 'Table.Cell';
    
    let renderedChildren = children;
    if (isFirstChildCell) {
        renderedChildren = [
            React.cloneElement(firstChild, {
                key: 'first-cell',
                children: (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="text-[var(--gray-10)] hover:text-[var(--gray-12)] focus:outline-none shrink-0"
                            aria-expanded={isExpanded}
                        >
                            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </button>
                        {firstChild.props.children}
                    </div>
                )
            }),
            ...childrenArray.slice(1)
        ];
    }

    return (
        <Table.Row
            ref={ref}
            onClick={(e) => {
                if (!(e.target as HTMLElement).closest('button, a, input, select, textarea')) {
                    onToggle();
                }
            }}
            className={`cursor-pointer ${isExpanded ? 'bg-[var(--gray-2)]' : ''} ${className || ''}`}
            {...props}
        >
            {isFirstChildCell ? renderedChildren : (
                <>
                    <Table.Cell className="w-10">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggle(); }}
                            className="text-[var(--gray-10)] hover:text-[var(--gray-12)] focus:outline-none shrink-0 flex items-center justify-center w-full h-full"
                        >
                            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </button>
                    </Table.Cell>
                    {children}
                </>
            )}
        </Table.Row>
    );
});
ExpandableRow.displayName = "Table.ExpandableRow";

const ExpandedContent = React.forwardRef<
    HTMLTableRowElement,
    React.ComponentPropsWithoutRef<typeof Table.Row> & { isExpanded: boolean; colSpan: number }
>(({ className, isExpanded, colSpan, children, ...props }, ref) => {
    if (!isExpanded) return null;
    return (
        <Table.Row
            ref={ref}
            className={`bg-[var(--gray-2)] ${className || ''}`}
            {...props}
        >
            <Table.Cell colSpan={colSpan} className="p-0">
                {children}
            </Table.Cell>
        </Table.Row>
    );
});
ExpandedContent.displayName = "Table.ExpandedContent";

interface PaginationProps {
    currentPage: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    label?: string;
    className?: string;
    showAll?: boolean;
    onShowAllChange?: (showAll: boolean) => void;
}

const Pagination = ({
    currentPage,
    total,
    pageSize,
    onPageChange,
    label = "items",
    className,
    showAll = false,
    onShowAllChange,
}: PaginationProps) => {
    if (total === 0) return null;

    const totalPages = Math.ceil(total / pageSize);
    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, total);

    return (
        <Flex align="center" justify="between" pt="3" px="2" style={{ width: '100%' }} className={className}>
            <Flex align="center" gap="2">
                <Text size="1" color="gray">
                    {showAll
                        ? `Showing all ${total} ${label}`
                        : `Showing ${from} to ${to} of ${total} ${label}`
                    }
                </Text>
                {onShowAllChange && (
                    <>
                        <Text size="1" color="gray">·</Text>
                        <Link
                            size="1"
                            color="gray"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                onShowAllChange(!showAll);
                                if (showAll) onPageChange(1);
                            }}
                        >
                            {showAll ? 'Paginate' : 'Show all'}
                        </Link>
                    </>
                )}
            </Flex>
            {!showAll && (
                <Flex align="center" gap="2">
                    <Button
                        variant="soft"
                        color="gray"
                        size="1"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                        style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                        <ChevronLeftIcon /> Previous
                    </Button>
                    <Button
                        variant="soft"
                        color="gray"
                        size="1"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                        style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                        Next <ChevronRightIcon />
                    </Button>
                </Flex>
            )}
        </Flex>
    );
};
Pagination.displayName = "Table.Pagination";

const RadixTable = {
    Root,
    Header,
    Body,
    Footer,
    Row,
    Head,
    Cell,
    SortableHead,
    Caption,
    ExpandableRow,
    ExpandedContent,
    Pagination
};

export default RadixTable;
