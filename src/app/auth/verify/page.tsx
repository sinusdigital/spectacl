'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Flex, Heading, Text, Card } from '@radix-ui/themes';
import { EnvelopeOpenIcon } from '@radix-ui/react-icons';
import Button from '@/components/Shared/Button';
import ShaderBackground from '@/components/ui/ShaderBackground';
import AuthFooter from '@/components/Shared/AuthFooter';

export const dynamic = 'force-dynamic';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const callbackURL = searchParams.get('callbackURL') || '/auth/callback';

  const handleVerify = () => {
    // Navigate to the real better-auth verification endpoint.
    // This only fires on user click — email link scanners (Safe Links,
    // Proofpoint) fetch this page but never execute JS or click buttons.
    const verifyUrl = new URL('/api/auth/magic-link/verify', window.location.origin);
    if (token) verifyUrl.searchParams.set('token', token);
    verifyUrl.searchParams.set('callbackURL', callbackURL);
    window.location.href = verifyUrl.toString();
  };

  if (!token) {
    return (
      <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
        <Flex direction="column" align="center" gap="3">
          <Heading size="6" weight="bold" className="tracking-tight">Invalid link</Heading>
          <Text size="2" color="gray" align="center">
            This sign-in link is invalid or incomplete. Please request a new one.
          </Text>
          <Button size="lg" className="w-full" onClick={() => { window.location.href = '/login'; }}>
            Back to login
          </Button>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="4" variant="surface" className="w-full max-w-md mx-auto shadow-2xl relative z-20">
      <Flex direction="column" align="center" gap="4">
        <EnvelopeOpenIcon width="36" height="36" color="var(--accent-9)" />
        <Flex direction="column" align="center" gap="2">
          <Heading size="6" weight="bold" className="tracking-tight">Confirm sign in</Heading>
          <Text size="2" color="gray" align="center">
            Click the button below to complete signing in to Spectacl.
          </Text>
        </Flex>
        <Button size="lg" className="w-full" onClick={handleVerify}>
          Sign in to Spectacl
        </Button>
      </Flex>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-[100dvh] relative w-full flex flex-col bg-[var(--color-background)]">
      <ShaderBackground scrollable>
        <div className="flex-1 flex items-center justify-center w-full">
          <Suspense fallback={
            <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
              <Text color="gray">Loading...</Text>
            </Flex>
          }>
            <VerifyContent />
          </Suspense>
        </div>
        <AuthFooter />
      </ShaderBackground>
    </div>
  );
}
