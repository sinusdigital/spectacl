import { Text, Link } from '@react-email/components';
import { EmailLayout, EmailButton, EmailCallout, SLATE, BRAND } from './components/layout';
import * as React from 'react';

export interface InvoiceEmailProps {
  invoiceNumber: string;
  spaceName: string;
  companyName: string;
  total: string;
  taxLabel: string;
  issuedDate: string;
  invoiceUrl: string;
  userName?: string;
}

export default function InvoiceEmail({
  invoiceNumber,
  spaceName,
  companyName,
  total,
  taxLabel,
  issuedDate,
  invoiceUrl,
  userName,
}: InvoiceEmailProps) {
  return (
    <EmailLayout
      preview={`Invoice ${invoiceNumber} for ${spaceName}`}
      headerTitle="Invoice"
    >
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        {userName ? `Hi ${userName},` : 'Hi there,'}
      </Text>
      <Text style={{ fontSize: '16px', lineHeight: '1.6', color: SLATE.step12 }}>
        Your invoice for <strong>{spaceName}</strong> is ready.
      </Text>
      <EmailCallout>
        <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: SLATE.step12 }}>
          <strong>Invoice {invoiceNumber}</strong>
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: SLATE.step11 }}>
          Billed to: {companyName}
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: SLATE.step11 }}>
          Date: {issuedDate}
        </Text>
        <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: SLATE.step11 }}>
          Tax: {taxLabel}
        </Text>
        <Text style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 700, color: SLATE.step12 }}>
          Total: {total}
        </Text>
      </EmailCallout>
      <EmailButton href={invoiceUrl}>
        Download Invoice PDF
      </EmailButton>
      <Text style={{ fontSize: '14px', lineHeight: '1.6', color: SLATE.step11, marginTop: '30px' }}>
        If you have any questions about this invoice, reach out to us at{' '}
        <Link href="mailto:billing@spectacl.org" style={{ color: BRAND.link }}>
          billing@spectacl.org
        </Link>.
      </Text>
    </EmailLayout>
  );
}

InvoiceEmail.PreviewProps = {
  invoiceNumber: 'SPE-2026-0001',
  spaceName: 'Acme Corp',
  companyName: 'Acme B.V.',
  total: '€119.79',
  taxLabel: '21% BTW',
  issuedDate: '11 April 2026',
  invoiceUrl: 'https://app.spectacl.org/api/billing/invoices/abc123?format=pdf',
  userName: 'John Doe',
} satisfies InvoiceEmailProps;
