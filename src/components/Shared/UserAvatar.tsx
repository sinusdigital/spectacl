import { Avatar } from "@radix-ui/themes";

interface UserAvatarProps {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export function UserAvatar({ 
    name, 
    email, 
    image, 
    size = 'md', 
    className = "" 
}: UserAvatarProps) {
    const initials = name
        ? name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2)
        : email
            ? email[0].toUpperCase()
            : '?';

    const radixSize = {
        xs: '1',
        sm: '2',
        md: '3',
        lg: '4',
        xl: '5',
    } as const;

    return (
        <Avatar
            src={image || undefined}
            fallback={initials}
            size={radixSize[size]}
            className={className}
            radius="full"
            variant="solid"
            color="lime"
        />
    );
}
