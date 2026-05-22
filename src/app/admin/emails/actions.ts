'use server';

import { render } from '@react-email/components';
import { createElement } from 'react';
import MagicLinkEmail from '@/emails/magic-link-email';
import InvitationEmail from '@/emails/invitation-email';
import CancellationEmail from '@/emails/cancellation-email';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PREVIEW_TEMPLATES: Record<string, { component: React.ComponentType<any>; props: Record<string, unknown> }> = {
  magicLink: {
    component: MagicLinkEmail,
    props: MagicLinkEmail.PreviewProps,
  },
  invitation: {
    component: InvitationEmail,
    props: InvitationEmail.PreviewProps,
  },
  cancellation: {
    component: CancellationEmail,
    props: CancellationEmail.PreviewProps,
  },
};

export async function renderEmailPreview(templateKey: string): Promise<string> {
  const template = PREVIEW_TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown template: ${templateKey}`);
  return render(createElement(template.component, template.props));
}
