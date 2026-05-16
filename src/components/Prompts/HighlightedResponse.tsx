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

// Trailing characters stripped from auto-detected URLs.
const URL_TRAILING_PUNCT = new Set([
    '.', ',', ';', ':', '!', '?', ')', ']', '\'', '"', '`',
    '»', '”', '’',
]);

// Returns the length of a URL starting at `text[start]`, or 0 if not a URL.
function scanUrl(text: string, start: number): number {
    const httpsLen = text.startsWith('https://', start) ? 8 : 0;
    const httpLen = !httpsLen && text.startsWith('http://', start) ? 7 : 0;
    const prefix = httpsLen || httpLen;
    if (!prefix) return 0;
    let i = start + prefix;
    while (i < text.length) {
        const ch = text[i];
        if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') break;
        if (ch === '(' || ch === ')' || ch === '[' || ch === ']') break;
        if (ch === '<' || ch === '>' || ch === '"' || ch === '`') break;
        i++;
    }
    while (i > start + prefix && URL_TRAILING_PUNCT.has(text[i - 1])) i--;
    return i - start;
}

// Returns the length of a markdown link `[text](url)` or reference `[text][id]`
// starting at `text[start]`, or 0 if not a link. Bounded linear scan: depth is
// hard-capped to prevent pathological nesting.
function scanMarkdownLink(text: string, start: number): number {
    if (text[start] !== '[') return 0;
    let i = start + 1;
    let depth = 1;
    const MAX_BRACKET_DEPTH = 8;
    while (i < text.length) {
        const ch = text[i];
        if (ch === '[') {
            depth++;
            if (depth > MAX_BRACKET_DEPTH) return 0;
        } else if (ch === ']') {
            depth--;
            if (depth === 0) { i++; break; }
        } else if (ch === '\n' && text[i + 1] === '\n') {
            return 0;
        }
        i++;
    }
    if (depth !== 0) return 0;
    while (i < text.length && (text[i] === ' ' || text[i] === '\t')) i++;
    if (text[i] === '[') {
        i++;
        let refDepth = 1;
        while (i < text.length && refDepth > 0) {
            const ch = text[i];
            if (ch === '[') {
                refDepth++;
                if (refDepth > MAX_BRACKET_DEPTH) return 0;
            } else if (ch === ']') {
                refDepth--;
            }
            i++;
        }
        if (refDepth !== 0) return 0;
        return i - start;
    }
    if (text[i] !== '(') return 0;
    i++;
    let parenDepth = 1;
    const MAX_PAREN_DEPTH = 8;
    while (i < text.length && parenDepth > 0) {
        const ch = text[i];
        if (ch === '(') {
            parenDepth++;
            if (parenDepth > MAX_PAREN_DEPTH) return 0;
        } else if (ch === ')') {
            parenDepth--;
        } else if (ch === '\n' && text[i + 1] === '\n') {
            return 0;
        }
        i++;
    }
    if (parenDepth !== 0) return 0;
    return i - start;
}

// Linear single-pass highlighter. Skips URLs and markdown/reference links so
// keyword matches inside them aren't double-wrapped. O(n * T * L) where T is
// term count and L is max term length — both bounded by entity/competitor set.
function highlightLinear(
    text: string,
    terms: string[],
    typeMap: Map<string, 'entity' | 'competitor'>,
): string {
    const lowerText = text.toLowerCase();
    const lowerTerms = terms.map(t => t.toLowerCase());
    let out = '';
    let i = 0;
    while (i < text.length) {
        const urlLen = scanUrl(text, i);
        if (urlLen > 0) {
            out += text.slice(i, i + urlLen);
            i += urlLen;
            continue;
        }
        const linkLen = scanMarkdownLink(text, i);
        if (linkLen > 0) {
            out += text.slice(i, i + linkLen);
            i += linkLen;
            continue;
        }
        let matched = false;
        for (let t = 0; t < lowerTerms.length; t++) {
            const lt = lowerTerms[t];
            if (lt.length === 0) continue;
            if (i + lt.length > text.length) continue;
            let ok = true;
            for (let k = 0; k < lt.length; k++) {
                if (lowerText.charCodeAt(i + k) !== lt.charCodeAt(k)) { ok = false; break; }
            }
            if (!ok) continue;
            const matchText = text.slice(i, i + lt.length);
            const type = typeMap.get(lt) || 'competitor';
            const target = type === 'entity' ? '#entity-highlight' : '#competitor-highlight';
            out += `[${matchText}](${target})`;
            i += lt.length;
            matched = true;
            break;
        }
        if (matched) continue;
        out += text[i];
        i++;
    }
    return out;
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

            // Unique terms sorted by length desc (longest-match-first).
            const allTerms = [entityName, ...primaryMentions, ...competitorMentions]
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort((a, b) => b.length - a.length);

            if (allTerms.length > 0) {
                displayText = highlightLinear(displayText, allTerms, typeMap);
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
