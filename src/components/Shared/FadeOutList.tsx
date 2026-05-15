import React from 'react';

interface FadeOutListProps {
    children: React.ReactNode;
    className?: string;
}

export default function FadeOutList({ children, className = '' }: FadeOutListProps) {
    return (
        <div className={`flex flex-nowrap gap-2 overflow-hidden [mask-image:linear-gradient(to_right,black_80%,transparent)] ${className}`}>
            {children}
        </div>
    );
}
