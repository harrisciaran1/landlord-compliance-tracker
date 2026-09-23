/**
 * POST /api/compliance/[itemId]/snooze - In app snooze (session auth)
 * GET /api/compliance/[itemId]/snooze - Email one-click snooze (HMAC token)
 * 
 * Supports both authenticated in-app snooze creation and
 * HMAC-signed email link snooze activation
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSnooze, verifySnoozeToken } from "@/lib/notifications/snooze";
import { getUkLocalDate } from "@/lib/notifications/timezone";

interface RouteContext {
    params: Promise<{ itemId: string }>;
}

/**
 * POST - In-app snooze creation.
 * Auth: Supabase session (cookie-based).
 */
export async function POST(request: Request, context: RouteContext) {
    const { itemId } = await context.params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch user profile for org_id
    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return Response.json({ error: "User profile not found"}, { status: 404});
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate snooze request
    const todayUk = getUkLocalDate();
    const validation = validateSnoozeRequest(body, todayUk);
    if (!validation.valid) {
        return Response.json({ error: validation.error }, { status: 400 });
    }

    try {
        const adminClient = createAdminClient();
        const snooze = await createSnooze(adminClient, {
            complianceItemId: itemId,
            userId: user.id,
            orgId: profile.org_id,
            snoozedUntil: validation.sanitized!.snoozed_until,
            reason: validation.sanitized!.reason,
        });

        return Response.json({ ok: true, snooze }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Compliance item not found") {
            return Response.json({ error: message }, { status: 404 });
        }
        return Response.json({ error: message }, { status: 500 });
    }
}

/**
 * GET - Email one-click snooze via HMAC token.
 * No user session required - authentication is via the signed token
 * Redirects to dashboard with a success/expired query param.
 */
export async function GET(request: Request, context: RouteContext) {
    const { itemId } = await context.params;
    const url = new URL(request.url);
    const baseUrl = process.env.APP_BASE_URL ?? "";

    const days = parseInt(url.searchParams.get("days") ?? "", 10);
    const uid = url.searchParams.get("uid") ?? "";
    const token = decodeURIComponent(url.searchParams.get("token") ?? "");

    if (!days || !uid || !token) {
        return Response.redirect(`${baseUrl}/dashboard?snooze=expired`, 302);
    }

    // Verify HMAC token
    const isValid = verifySnoozeToken(token, itemId, uid, days);
    if (!isValid) {
        return Response.redirect(`${baseUrl}/dashboard?snooze=expired`, 302);
    }

    // Create snooze using admin client (no user session for email clicks)
    try {
        const adminClient = createAdminClient();
        const todayUk = getUkLocalDate();
        const snoozedUntil = addDays(todayUk, days);

        // Look up user's org_id
        const { data: userProfile } = await adminClient
            .from("users")
            .select("org_id")
            .eq("id", uid)
            .single();
        
        if (!userProfile) {
            return Response.redirect(`${baseUrl}/dashboard?snooze=expired`, 302);
        }

        await createSnooze(adminClient, {
            complianceItemId: itemId,
            userId: uid,
            orgId: userProfile.org_id,
            snoozedUntil,
            reason: `Snoozed via email (${days} days)`,
        });

        return Response.redirect(`${baseUrl}/dashboard?snooze=success`, 302);
    } catch {
        return Response.redirect(`${baseUrl}/dashboard?snooze=expired`, 302);
    }
}

// --------------------------------------
// Helpers
// --------------------------------------

/** Add N days to an ISO date string, returning YYYY-MM-DD */
function addDays(isoDate: string, days: number): string {
    const date = new Date(isoDate + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().split("T")[0];
}

interface SnoozeValidation {
    valid: boolean;
    error?: string;
    sanitized?: { snoozed_until: string; reason: string | null };
}

function validateSnoozeRequest(body: unknown, todayUk: string): SnoozeValidation{
    if (!body || typeof body !== "object") {
        return { valid: false, error: "Request body must be a JSON object" };
    }

    const input = body as Record<string, unknown>;

    // snoozed_until: required ISO date
    if (!input.snoozed_until || typeof input.snoozed_until !== "string") {
        return { valid: false, error: "snoozed_until is required (YYYY-MM-DD)" };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.snoozed_until)) {
        return { valid: false, error: "snoozed_until must be in YYYY-MM-DD format" };
    }

    const parsed = new Date(input.snoozed_until + "T00:00:00Z");
    if (isNaN(parsed.getTime())) {
        return { valid: false, error: "snoozed_until is not a valid date" };
    }

    // Must be in the future
    if (input.snoozed_until <= todayUk) {
        return { valid: false, error: "snoozed_until must be after today" };
    }

    // Max 30 days from today
    const today = new Date(todayUk + "T00:00:00Z");
    const maxDate = new Date(today);
    maxDate.setUTCDate(maxDate.getUTCDate() + 30);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    if (input.snoozed_until > maxDateStr) {
        return { valid: false, error: `snoozed_until must be within 30 days (max: ${maxDateStr})` };
    }

    // reason: optional string, max 200 chars
    let reason: string | null = null;
    if ("reason" in input) {
        if (typeof input.reason !== "string") {
            return { valid: false, error: "reason must be a string" };
        }
        if (input.reason.length > 200) {
            return { valid: false, error: "reason must be 200 characters or fewer" };
        }
        reason = input.reason.trim() || null;
    }

    return { valid: true, sanitized: { snoozed_until: input.snoozed_until, reason } };
}