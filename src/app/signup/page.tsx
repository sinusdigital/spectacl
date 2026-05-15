import { Suspense } from 'react';
import { Flex, Text, Box } from '@radix-ui/themes';
import AuthFooter from '@/components/Shared/AuthFooter';
import ShaderBackground from '@/components/ui/ShaderBackground';
import MagicLinkForm from '@/components/Auth/MagicLinkForm';
import SignupValuePanel from '@/components/Auth/SignupValuePanel';
import { getTrialDays } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const trialDays = await getTrialDays();
  return (
    <div className="min-h-[100dvh] relative w-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-12 flex items-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 w-full items-center">
            <Box className="relative z-20 order-1 md:order-none">
              <SignupValuePanel trialDays={trialDays} />
            </Box>
            <Box className="relative z-20 order-2 md:order-none">
              <Suspense fallback={
                <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
                  <Text color="gray">Loading...</Text>
                </Flex>
              }>
                <MagicLinkForm intent="signup" />
              </Suspense>
            </Box>
          </div>
        </div>
        <AuthFooter />
      </ShaderBackground>
    </div>
  );
}
