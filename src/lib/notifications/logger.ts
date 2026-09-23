import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationLogEntry } from '@/lib/types/notifications';

/**
 * Batch insert notification log entries.
 */
export async function batchLogNotifications(
  client: SupabaseClient,
  entries: NotificationLogEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const { error } = await client.from('notification_log').insert(
    entries.map((entry) => ({
      org_id: entry.org_id,
      user_id: entry.user_id,
      compliance_item_id: entry.compliance_item_id,
      channel: entry.channel,
      template: entry.template,
      recipient: entry.recipient,
      status: entry.status,
      metadata: entry.metadata || null,
    }))
  );

  if (error) {
    console.error('[batchLogNotifications] Failed to log notifications:', error.message);
    throw new Error(`Failed to log notifications: ${error.message}`);
  }
}
