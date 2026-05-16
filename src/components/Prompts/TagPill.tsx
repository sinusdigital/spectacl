import { Badge, Flex } from "@radix-ui/themes";

interface Tag {
    id: string;
    name: string;
    color?: string | null;
}

interface TagPillProps {
    tag: Tag;
    onRemove?: (tagId: string) => void;
    className?: string;
    size?: 'sm' | 'md';
}

export default function TagPill({ tag, onRemove, className = "", size = 'md' }: TagPillProps) {
    const badgeSize = size === 'sm' ? '1' : '2';

    return (
        <Badge
            size={badgeSize}
            variant="soft"
            color="blue"
            className={className}
            style={tag.color ? { backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` } : {}}
        >
            <Flex align="center" gap="1">
                {tag.name}
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(tag.id);
                        }}
                        className="hover:opacity-75 transition-opacity"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </Flex>
        </Badge>
    );
}
