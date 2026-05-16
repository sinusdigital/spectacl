/**
 * Deep-links to a user's email inbox with a pre-filled search for the
 * Spectacl magic link email. Supported providers get a search query;
 * others get a plain inbox link; unknown domains return null.
 */

const SENDER = "hello@mail.spectacl.org";

/** Provider icon key — top 3 get custom icons, rest use generic arrow */
export type InboxIcon = "gmail" | "outlook" | "apple" | "generic";

export interface InboxLink {
  url: string;
  label: string;
  icon: InboxIcon;
}

/**
 * Provider inbox URLs with search query support.
 * Gmail: full search (from, unread, recent)
 * Outlook/Yahoo: from-only search
 * Others: plain inbox (no search support in URL)
 */
function gmailSearch(): string {
  // Gmail search operators: from:, is:unread, newer_than:
  // Encoded for URL fragment: #search/query
  const query = `from:${SENDER} is:unread newer_than:5m`;
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`;
}

function outlookSearch(): string {
  return `https://outlook.live.com/mail/0/inbox?searchQuery=${encodeURIComponent(`from:${SENDER}`)}`;
}

function yahooSearch(): string {
  return `https://mail.yahoo.com/d/search/keyword=${encodeURIComponent(`from:${SENDER}`)}`;
}

const PROVIDERS: Record<string, InboxLink> = {
  "gmail.com":       { url: gmailSearch(),     label: "Gmail",      icon: "gmail" },
  "googlemail.com":  { url: gmailSearch(),     label: "Gmail",      icon: "gmail" },
  "outlook.com":     { url: outlookSearch(),   label: "Outlook",    icon: "outlook" },
  "hotmail.com":     { url: outlookSearch(),   label: "Outlook",    icon: "outlook" },
  "live.com":        { url: outlookSearch(),   label: "Outlook",    icon: "outlook" },
  "yahoo.com":       { url: yahooSearch(),     label: "Yahoo Mail", icon: "generic" },
  "yahoo.co.uk":     { url: yahooSearch(),     label: "Yahoo Mail", icon: "generic" },
  "icloud.com":      { url: "https://www.icloud.com/mail", label: "iCloud Mail", icon: "apple" },
  "me.com":          { url: "https://www.icloud.com/mail", label: "iCloud Mail", icon: "apple" },
  "mac.com":         { url: "https://www.icloud.com/mail", label: "iCloud Mail", icon: "apple" },
  "proton.me":       { url: "https://mail.proton.me", label: "Proton Mail", icon: "generic" },
  "protonmail.com":  { url: "https://mail.proton.me", label: "Proton Mail", icon: "generic" },
  "hey.com":         { url: "https://app.hey.com",    label: "HEY",         icon: "generic" },
  "aol.com":         { url: "https://mail.aol.com",   label: "AOL Mail",    icon: "generic" },
};

export function getInboxLink(email: string): InboxLink | null {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return null;
  return PROVIDERS[domain] ?? null;
}
