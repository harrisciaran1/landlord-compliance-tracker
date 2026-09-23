import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Run the daily expiry check pipeline.
 * TODO: Implement full logic — query compliance items at trigger points,
 * filter for non-snoozed, send reminders via email/SMS, log results.
 */
export async function runExpiryCheckPipeline(adminClient: SupabaseClient) {
  console.log('[runExpiryCheckPipeline] Starting...');

  // Stub implementation
  // TODO: Implement actual pipeline:
  // 1. Query compliance items WHERE expiry_date IN (today, today+1, today+7, today+14, today+30, today+90)
  // 2. Filter out snoozed items
  // 3. Resolve user notification preferences
  // 4. Send emails via sendEmail()
  // 5. Send SMS if enabled
  // 6. Log all sends to notification_log

  const summary = {
    checked: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  console.log('[runExpiryCheckPipeline] Completed:', summary);
  return summary;
}

/**
 * Run the monthly digest pipeline.
 * Sends "all clear" or summary emails on the first Monday of each month.
 */
export async function runMonthlyDigestPipeline(adminClient: SupabaseClient) {
  console.log('[runMonthlyDigestPipeline] Starting...');

  // Stub implementation
  // TODO: Implement actual pipeline:
  // 1. Query all active users with monthly_digest enabled
  // 2. For each user, compute portfolio status
  // 3. Send digest email (all clear or upcoming deadlines)
  // 4. Log sends

  const result = {
    sent: 0,
    skipped: 0,
  };

  console.log('[runMonthlyDigestPipeline] Completed:', result);
  return result;
}
