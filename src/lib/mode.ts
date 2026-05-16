/**
 * Deployment mode helpers.
 *
 * NEXT_PUBLIC_SPECTACL_MODE controls whether billing, payments, credits,
 * trials, and upgrade UI are active.
 *
 *   "cloud"       → SaaS mode (billing enabled, plan limits enforced)
 *   anything else → self-hosted mode (unlimited everything, no billing)
 *
 * Default is self-hosted so open-source users get a working product
 * without configuring payment infrastructure.
 */

export function isCloud(): boolean {
  return process.env.NEXT_PUBLIC_SPECTACL_MODE === 'cloud';
}

export function isSelfHosted(): boolean {
  return process.env.NEXT_PUBLIC_SPECTACL_MODE !== 'cloud';
}

/**
 * Safety net: detects likely misconfiguration where billing infra
 * is present (MOLLIE_API_KEY set) but mode is not 'cloud'.
 *
 * A self-hoster would never have a Mollie key, so this combination
 * almost certainly means the SaaS deployment lost its SPECTACL_MODE
 * env var — billing enforcement would be silently disabled.
 *
 * Call once at server startup (instrumentation.ts) and worker entry.
 */
export function checkModeConsistency(): void {
  const mode = process.env.NEXT_PUBLIC_SPECTACL_MODE ?? '(unset)';

  if (process.env.MOLLIE_API_KEY && mode !== 'cloud') {
    console.warn(
      '\n⚠️  SPECTACL MODE MISMATCH ⚠️\n' +
      '   MOLLIE_API_KEY is configured but NEXT_PUBLIC_SPECTACL_MODE is not "cloud".\n' +
      `   Current mode: ${mode}\n` +
      '   Billing enforcement is DISABLED. All spaces get unlimited access.\n' +
      '   If this is the SaaS deployment, set NEXT_PUBLIC_SPECTACL_MODE=cloud\n',
    );
  }

  console.log(`[Mode] Spectacl running in ${mode === 'cloud' ? 'cloud' : 'self-hosted'} mode`);
}
