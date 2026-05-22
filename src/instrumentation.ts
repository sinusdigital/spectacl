export async function register() {
  // Safety net: warn if billing infra is present but mode is not 'cloud'
  const { checkModeConsistency } = await import('@/lib/mode');
  checkModeConsistency();
}
