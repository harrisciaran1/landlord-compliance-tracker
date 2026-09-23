import type { SmsSendResult } from '@/lib/types/notifications';

interface SendSmsParams {
  to: string;
  body: string;
}

/**
 * Send an SMS via Twilio.
 * TODO: Install twilio package and implement actual sending.
 */
export async function sendSms(params: SendSmsParams): Promise<SmsSendResult> {
  const { to, body } = params;

  // Stub implementation — will be replaced with actual Twilio client
  console.log(`[SMS Stub] Would send to ${to}: ${body}`);

  // TODO: Implement actual Twilio sending:
  // const client = require('twilio')(
  //   process.env.TWILIO_ACCOUNT_SID,
  //   process.env.TWILIO_AUTH_TOKEN
  // );
  // const message = await client.messages.create({
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to,
  //   body,
  // });
  // return { messageId: message.sid };

  return { messageId: 'stub-sms-id' };
}
