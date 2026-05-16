import { Text } from '@react-email/components';
import { EmailLayout, EmailButton, EmailUrlFallback, EmailCallout, SLATE } from './components/layout';
import * as React from 'react';

export interface MagicLinkEmailProps {
  magicUrl: string;
  userName?: string;
}

export default function MagicLinkEmail({ magicUrl, userName }: MagicLinkEmailProps) {
  return (
    <EmailLayout
      preview="Your sign-in link for Spectacl"
      headerTitle="Sign In to Spectacl"
    >
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        {userName ? `Hi ${userName},` : 'Hi there,'}
      </Text>
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        Click the button below to sign in to your Spectacl account. This link expires in 10 minutes.
      </Text>
      <EmailButton href={magicUrl}>
        Sign In to Spectacl
      </EmailButton>
      <EmailCallout>
        This link can only be used once. If you didn&apos;t request this, you can safely ignore this email.
      </EmailCallout>
      <EmailUrlFallback href={magicUrl} />
    </EmailLayout>
  );
}

MagicLinkEmail.PreviewProps = {
  magicUrl: 'https://app.spectacl.org/api/auth/magic-link/verify?token=sample_token_123',
  userName: 'John Doe',
} satisfies MagicLinkEmailProps;
