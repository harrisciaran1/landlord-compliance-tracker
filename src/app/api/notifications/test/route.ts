/**
 * POST /api/notification/test
 * 
 * Send a test notification to the authenticated user.
 * Validates Resend/Twilio integration is working.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/channels/email";
import { sendSms } from "@/lib/notifications/channels/sms";
import { batchLogNotifications } from "@/lib/notifications/logger";
import { ExpiryReminderEmail } from "@/lib/notifications/templates/expiry-reminder";
import type { NotificationPrefs, NotificationChannel } from "@/lib/types/notifications";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate channel
    if (
        !body ||
        typeof body !== "object" ||
        !("channel" in body) ||
        ((body as { channel: unknown }).channel !== "email" &&
            (body as { channel: unknown }).channel !== "sms")
    ) {
        return Response.json(
            { error: 'channel ,ust be "email" or "sms"' },
            { status: 400 }
        );
    }

    const channel = (body as { channel: NotificationChannel }).channel;

    // Fetch user profile
    const { data: profile } = await supabase
        .from("users")
        .select("full_name, org_id, notification_prefs")
        .eq("id", user.id)
        .single();
    
    if (!profile) {
        return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    const prefs = (profile.notification_prefs ?? {}) as NotificationPrefs;

    try {
        if (channel === "email") {
            // Render a test expiry reminder email with sample data
            const reactTemplate = ExpiryReminderEmail({
                recipientName: profile.full_name || "Landlord",
                propertyAddress: "123 Test Street",
                postcode: "SW1A 1AA",
                complianceType: "Gas Safety Certificate",
                expiryDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "long", year: "numeric" }
                ),
                daysRemaining: 30,
                urgency: "advisory",
                snoozeUrl: `${process.env.APP_BASE_URL ?? ""}/dashboard`,
                dashboardUrl: `${process.env.APP_BASE_URL ?? ""}/dashboard`,
                complianceItemId: "test",
            });

            const result = await sendEmail({
                to: user.email!,
                subject: "[TEST] CompliTrack notification test",
                reactTemplate,
            });

            // Log the test send
            const adminClient = createAdminClient();
            await batchLogNotifications(adminClient, [
                {
                    org_id: profile.org_id,
                    user_id: user.id,
                    compliance_item_id: "00000000-0000-0000-0000-000000000000",
                    channel: "email",
                    template: "test-email",
                    recipient: user.email!,
                    status: "sent",
                    metadata: { message_id: result.messageId, test: true },
                },
            ]);

            return Response.json({
                ok: true,
                channel: "email",
                messageId: result.messageId,
            });
        } else {
            // SMS test
            if (!prefs.sms_phone) {
                return Response.json(
                    { ok: false, error: "SMS is not enabled or phone number is not configured" },
                    { status: 400 }
                );
            }

            const result = await sendSms({
                to: prefs.sms_phone,
                body: "[CompliTrack] This is a test notification. If you recieved this, SMS is configured correctly.",
            });

            // Log the test send
            const adminClient = createAdminClient();
            await batchLogNotifications(adminClient, [
                {
                    org_id: profile.org_id,
                    user_id: user.id,
                    compliance_item_id: "00000000-0000-0000-0000-000000000000",
                    channel: "sms",
                    template: "test-sms",
                    recipient: prefs.sms_phone,
                    status: "sent",
                    metadata: { message_id: result.messageId, test: true },
                },
            ]);

            return Response.json({
                ok: true,
                channel: "sms",
                messageId: result.messageId,
            });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return Response.json(
            { ok: false, channel, error: message },
            { status: 502 }
        );
    }
}