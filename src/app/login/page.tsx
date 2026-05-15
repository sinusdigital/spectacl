import { Suspense } from 'react';
import { Flex, Text, Heading, Box } from '@radix-ui/themes';
import AuthFooter from '@/components/Shared/AuthFooter';
import ShaderBackground from '@/components/ui/ShaderBackground';
import MagicLinkForm from '@/components/Auth/MagicLinkForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] relative w-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <div className="flex-1 flex items-center justify-center w-full">
          <Flex direction="column" align="center" gap="6" className="w-full px-4 py-8">
            {/* Brand mark above form */}
            <Flex align="center" gap="2" className="relative z-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-light.png"
                alt=""
                width={28}
                height={28}
                style={{ display: 'block', borderRadius: 6 }}
              />
              <Heading size="4" weight="bold" className="tracking-tight">
                Spectacl
              </Heading>
            </Flex>

            <Box className="w-full">
              <Suspense fallback={
                <Flex align="center" justify="center" style={{ minHeight: '300px' }}>
                  <Text color="gray">Loading...</Text>
                </Flex>
              }>
                <MagicLinkForm intent="signin" />
              </Suspense>
            </Box>
          </Flex>
        </div>
        <AuthFooter />
      </ShaderBackground>
    </div>
  );
}
