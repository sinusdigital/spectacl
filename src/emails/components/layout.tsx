import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

/**
 * Spectacl brand colors — sourced from the app's custom Radix lime palette
 * (src/styles/radix-colors.css). Hardcoded hex because CSS variables don't
 * work in email clients.
 */
export const BRAND = {
  bg:      '#2b4d1a', // lime-9  — header + button background (= app primary CTA)
  bgHover: '#3c5e2b', // lime-10 — button hover (informational only)
  link:    '#457d28', // lime-11 — hyperlinks
  callout: '#dbface', // lime-3  — callout / info box background
  body:    '#ffffff', // white — email body background
};

/** Neutral text/border values — Radix slate scale */
export const SLATE = {
  step4:  '#E8E8EC', // borders
  step11: '#687076', // secondary text
  step12: '#11181C', // primary text
};

export interface EmailLayoutProps {
  preview: string;
  headerTitle: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, headerTitle, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Tailwind>
        <Head />
        <Preview>{preview}</Preview>
        <Body style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", margin: 0, padding: 0, backgroundColor: BRAND.body }}>
          <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            {/* Header */}
            <Section style={{
              backgroundColor: BRAND.bg,
              padding: '30px',
              textAlign: 'center' as const,
              borderRadius: '8px 8px 0 0',
            }}>
              <Heading style={{ margin: 0, fontSize: '28px', color: 'white' }}>
                {headerTitle}
              </Heading>
            </Section>

            {/* Content */}
            <Section style={{
              backgroundColor: 'white',
              padding: '30px',
              border: `1px solid ${SLATE.step4}`,
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
            }}>
              {children}
            </Section>

            {/* Footer */}
            <Section style={{ textAlign: 'center' as const, padding: '20px 0' }}>
              <Text style={{ fontSize: '14px', color: SLATE.step11, margin: 0 }}>
                &copy; {new Date().getFullYear()} Spectacl. All rights reserved.
              </Text>
              <Link href="https://app.spectacl.org" style={{ fontSize: '14px', color: SLATE.step11, textDecoration: 'none' }}>
                app.spectacl.org
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Primary CTA button — matches the app's lime solid button */
export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center' as const }}>
      <a
        href={href}
        style={{
          display: 'inline-block',
          backgroundColor: BRAND.bg,
          color: 'white',
          padding: '14px 28px',
          textDecoration: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          margin: '20px 0',
        }}
      >
        {children}
      </a>
    </div>
  );
}

/** URL fallback text shown below CTA buttons */
export function EmailUrlFallback({ href }: { href: string }) {
  return (
    <Text style={{ fontSize: '14px', lineHeight: '1.6', color: SLATE.step11 }}>
      Or copy and paste this URL into your browser:<br />
      <Link href={href} style={{ color: BRAND.link, wordBreak: 'break-all' as const }}>
        {href}
      </Link>
    </Text>
  );
}

/** Info / callout box — lime-3 background with lime-9 left border */
export function EmailCallout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: BRAND.callout,
      borderLeft: `4px solid ${BRAND.bg}`,
      padding: '12px',
      margin: '20px 0',
      borderRadius: '4px',
    }}>
      {children}
    </div>
  );
}
