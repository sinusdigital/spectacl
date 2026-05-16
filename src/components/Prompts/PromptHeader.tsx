import Link from "next/link";
import { Prompt } from "@/types/prompts";
import { IconButton } from "@radix-ui/themes";
import { ChevronLeftIcon } from "@radix-ui/react-icons";

interface PromptHeaderProps {
    prompt: Prompt;
    entityId: string;
}

export default function PromptHeader({ prompt, entityId }: PromptHeaderProps) {
    return (
        <div className="flex items-center gap-3">
            <Link href={`/${entityId}/prompts`}>
                <IconButton variant="surface" color="gray" radius="medium" size="2" aria-label="Back to prompts" className="cursor-pointer shadow-sm">
                    <ChevronLeftIcon />
                </IconButton>
            </Link>
            <div
                className="text-sm font-medium text-[var(--gray-12)]"
                style={{ minWidth: 0, flexShrink: 1 }}
                title={prompt.text}
            >
                <span style={{
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                    maxWidth: '360px',
                }}>
                    {prompt.text}
                </span>
            </div>
        </div>
    );
}
