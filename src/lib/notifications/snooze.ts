import type { SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

interface CreateSnoozeParams {
  complianceItemId: string;
  userId: string;
  orgId: string;
  snoozedUntil: string;
  reason: string | null;
}

/**
 * Create a notification snooze record.
 */
export async function createSnooze(
  client: SupabaseClient,
  params: CreateSnoozeParams
) {
  const { complianceItemId, userId, orgId, snoozedUntil, reason } = params;

  // Verify compliance item exists and belongs to user's org
  const { data: item } = await client
    .from('compliance_items')
    .select('id, property_id, properties!inner(org_id)')
    .eq('id', complianceItemId)
    .single();

  if (!item) {
    throw new Error('Compliance item not found');
  }

  const property = item.properties as unknown as { org_id: string };
  if (property.org_id !== orgId) {
    throw new Error('Access denied');
  }

  // Insert snooze record
  const { data, error } = await client
    .from('notification_snoozes')
    .insert({
      compliance_item_id: complianceItemId,
      snoozed_by: userId,
      snoozed_until: snoozedUntil,
      reason,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create snooze: ${error.message}`);
  }

  return data;
}

/**
 * Generate HMAC token for email one-click snooze links.
 */
export function generateSnoozeToken(
  complianceItemId: string,
  userId: string,
  days: number
): string {
  const secret = process.env.CRON_SECRET || 'fallback-secret';
  const payload = `${complianceItemId}:${userId}:${days}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('base64url');
}

/**
 * Verify HMAC token for email one-click snooze.
 */
export function verifySnoozeToken(
  token: string,
  complianceItemId: string,
  userId: string,
  days: number
): boolean {
  const expected = generateSnoozeToken(complianceItemId, userId, days);
  return token === expected;
}
