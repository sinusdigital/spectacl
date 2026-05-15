import { Text, Link } from '@react-email/components';
import { EmailLayout, EmailCallout, SLATE, BRAND } from './components/layout';
import * as React from 'react';

export interface CancellationEmailProps {
  spaceName: string;
  cancelledBySelf: boolean;
  userName?: string;
  /** ISO date string of when the current billing period ends */
  periodEndDate?: string;
}

export default function CancellationEmail({ spaceName, cancelledBySelf, userName, periodEndDate }: CancellationEmailProps) {
  const initiator = cancelledBySelf ? 'you' : 'an admin of the space';
  const formattedDate = periodEndDate
    ? new Date(periodEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <EmailLayout
      preview={`Your Spectacl workspace "${spaceName}" has been cancelled`}
      headerTitle="Subscription Cancelled"
    >
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        {userName ? `Hi ${userName},` : 'Hi there,'}
      </Text>
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        Your Spectacl workspace <strong>{spaceName}</strong> has been cancelled by {initiator}.
      </Text>
      <EmailCallout>
        <Text style={{ margin: 0, fontSize: '14px', color: SLATE.step12 }}>
          <strong>What happens next:</strong> You will retain full access until{' '}
          {formattedDate ? <strong>{formattedDate}</strong> : 'the end of your current billing period'}.
          {' '}After that, your data will be available in read-only mode for 90 days before being permanently deleted.
        </Text>
      </EmailCallout>
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        If you&apos;d like to reactivate, simply log in and choose a plan.
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: '1.6', color: SLATE.step11, marginTop: '30px' }}>
        If you have any questions, reach out to us at{' '}
        <Link href="mailto:support@spectacl.org" style={{ color: BRAND.link }}>
          support@spectacl.org
        </Link>.
      </Text>
    </EmailLayout>
  );
}

CancellationEmail.PreviewProps = {
  spaceName: 'Acme Corp',
  cancelledBySelf: false,
  userName: 'John Doe',
  periodEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
} satisfies CancellationEmailProps;
