import { Resend } from 'resend';
import type { EmailSendResult } from '@/lib/types/notifications';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  reactTemplate: React.ReactElement;
}

/**
 * Send an email via Resend.
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
  const { to, subject, reactTemplate } = params;

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'CompliTrack <notifications@complitrack.co.uk>',
    to,
    subject,
    react: reactTemplate,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return { messageId: data?.id || 'unknown' };
}
