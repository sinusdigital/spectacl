/**
 * Validates a caller-supplied `returnPath` for use in Mollie's
 * post-checkout redirect URL. Prevents open-redirect / SSRF-style
 * attacks by only allowing relative paths on our own origin.
 *
 * Default: `/spaces`.
 *
 * Allowed:
 *   /foo
 *   /foo/bar?x=1#y
 *   /foo%20bar
 *
 * Rejected (default to /spaces):
 *   //evil.com           (protocol-relative → external origin)
 *   /\\evil              (backslash tricks some browsers' URL parsers)
 *   javascript:alert(1)  (no leading slash, not a safe path)
 *   https://evil.com     (absolute URL, external)
 *   null / undefined / non-string
 *   "" (empty)
 *   strings containing newlines, tabs, or other control chars
 */
export function safeReturnPath(input: unknown): string {
  if (!input || typeof input !== 'string') return '/spaces';
  // Must start with /, must not contain protocol or double-slash (//), no backslash
  if (!/^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/.test(input)) return '/spaces';
  if (input.includes('//') || input.includes('\\')) return '/spaces';
  return input;
}
