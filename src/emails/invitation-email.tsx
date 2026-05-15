import { Text } from '@react-email/components';
import { EmailLayout, EmailButton, EmailUrlFallback, SLATE } from './components/layout';
import * as React from 'react';

export interface InvitationEmailProps {
  inviteUrl: string;
  spaceName: string;
  userName?: string;
}

export default function InvitationEmail({ inviteUrl, spaceName, userName }: InvitationEmailProps) {
  return (
    <EmailLayout
      preview={`You've been invited to join ${spaceName} on Spectacl`}
      headerTitle="You've Been Invited!"
    >
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        Hi there,
      </Text>
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        {userName || 'Someone'} has invited you to join the <strong>{spaceName}</strong> space on Spectacl.
      </Text>
      <EmailButton href={inviteUrl}>
        Join Space
      </EmailButton>
      <Text style={{ fontSize: '14px', lineHeight: '1.6', color: SLATE.step11, marginTop: '30px' }}>
        This invitation link will expire in 7 days.
      </Text>
      <EmailUrlFallback href={inviteUrl} />
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  inviteUrl: 'https://app.spectacl.org/invite/sample_token',
  spaceName: 'Acme Corp',
  userName: 'Jane Smith',
} satisfies InvitationEmailProps;
