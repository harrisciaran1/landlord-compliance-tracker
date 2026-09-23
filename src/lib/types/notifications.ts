export type NotificationChannel = 'email' | 'sms' | 'push';

export type DigestFrequency = 'realtime' | 'daily';

export interface NotificationPrefs {
  email_enabled: boolean;
  sms_enabled: boolean;
  sms_phone?: string;
  digest_frequency: DigestFrequency;
  quiet_hours_start: string;
  quiet_hours_end: string;
  monthly_digest: boolean;
  reminder_days: number[];
  bounce_disabled?: boolean;
  bounce_count?: number;
}

export interface NotificationPrefsUpdate {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  sms_phone?: string;
  digest_frequency?: DigestFrequency;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  monthly_digest?: boolean;
  reminder_days?: number[];
}

export interface NotificationLogEntry {
  org_id: string;
  user_id: string;
  compliance_item_id: string;
  channel: NotificationChannel;
  template: string;
  recipient: string;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  messageId: string;
}

export interface SmsSendResult {
  messageId: string;
}
