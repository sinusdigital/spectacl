import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DetectedMention {
    isPrimaryEntity: boolean;
    detectedName: string;
    competitor?: {
        name: string;
    };
    competitorId?: string | null;
}

interface HighlightedResponseProps {
    content: string;
    entityName: string;
    mentions?: DetectedMention[] | null;
    isError?: boolean;
    className?: string; // Optional wrapper class names
}

export default function HighlightedResponse({
    content,
    entityName,
    mentions = [],
    isError = false,
    className = ""
}: HighlightedResponseProps) {

    // --- Highlighting Logic ---
    const processedContent = (() => {
        if (!entityName && !content) return "";

        let displayText = content;

        if (isError) {
            // Attempt to detect JSON and wrap it
            if (typeof displayText === 'string' && (displayText.trim().startsWith('{') || displayText.trim().startsWith('['))) {
                displayText = "```json\n" + displayText + "\n```";
            } else if (typeof displayText === 'string' && displayText.includes('Error:')) {
                // Highlight "Error:" text
                displayText = `**Analysis Failed**\n\n${displayText}`;
            }
        }

        // If not error or mixed content, proceed with highlighting logic
        if (!isError && entityName && displayText) {
            const primaryMentions = mentions?.filter(m => m.isPrimaryEntity).map(m => m.detectedName) || [];
            const competitorMentions = mentions?.filter(m => !m.isPrimaryEntity && m.competitorId).map(m => m.detectedName) || [];

            // Map lowercased names to their type
            const typeMap = new Map<string, 'entity' | 'competitor'>();
            typeMap.set(entityName.toLowerCase(), 'entity');
            primaryMentions.forEach(name => typeMap.set(name.toLowerCase(), 'entity'));
            competitorMentions.forEach(name => typeMap.set(name.toLowerCase(), 'competitor'));

            // Create unique list for regex, sorted by length descending
            const allTerms = [entityName, ...primaryMentions, ...competitorMentions]
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort((a, b) => b.length - a.length)
                .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

            if (allTerms.length > 0) {
                const urlPattern = /(https?:\/\/[^\s()]+(?:\([^)\s]*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/.source;
                const markdownLinkPattern = /(\[[^\]]*\]\s*\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\))/.source;
                const referenceLinkPattern = /(\[[^\]]*\]\s*\[[^\]]*\])/.source;
                const keywordsPattern = `(${allTerms.join('|')})`;

                const regex = new RegExp(`${urlPattern}|${markdownLinkPattern}|${referenceLinkPattern}|${keywordsPattern}`, 'gi');

                displayText = displayText.replace(regex, (match, url, mdLink, refLink) => {
                    // If it matched a URL, we need to handle potential trailing punctuation that might have been skipped by the regex
                    // but we also want to make sure we don't return a match that includes trailing brackets if it was a plain URL.
                    if (url) {
                        // Regular URLs matched by urlPattern
                        return match;
                    }
                    if (mdLink || refLink) return match;

                    const type = typeMap.get(match.toLowerCase()) || 'competitor';
                    const target = type === 'entity' ? '#entity-highlight' : '#competitor-highlight';
                    // We render a Markdown Link for the highlighter custom component to pick up
                    return `[${match}](${target})`;
                });
            }
        }

        return displayText;
    })();

    return (
        <div className={`prose prose-sm max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-ul:my-2 prose-li:my-0.5 ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, href, children, ...props }) => {
                        if (href === '#entity-highlight') {
                            return <span className="bg-green-100 px-0.5 rounded text-green-800 font-medium box-decoration-clone">{children}</span>;
                        }
                        if (href === '#competitor-highlight') {
                            return <span className="bg-yellow-100 px-0.5 rounded text-yellow-800 font-medium box-decoration-clone">{children}</span>;
                        }
                        return <a href={href} {...props} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>;
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
}
