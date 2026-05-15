'use client';

import NextLink from 'next/link';
import { Box, Text, Link } from '@radix-ui/themes';

export default function AuthFooter() {
  return (
    <Box
      className="relative z-30 text-center px-4"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
    >
      <Text size="1" color="gray" className="opacity-60">
        Spectacl is provided as is by Sinus Digital B.V. By continuing, you agree to our{' '}
        <Link asChild weight="medium" className="transition-colors underline">
          <NextLink href="/terms">Terms and Conditions</NextLink>
        </Link>{' '}
        and{' '}
        <Link asChild weight="medium" className="transition-colors underline">
          <NextLink href="/privacy">Privacy Policy</NextLink>
        </Link>.
        <br />
        © 2026 Sinus Digital B.V. All rights reserved. Thank you for supporting a young family startup.
      </Text>
    </Box>
  );
}
