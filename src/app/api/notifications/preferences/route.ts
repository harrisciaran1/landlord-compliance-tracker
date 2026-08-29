/**
 * GET /api/notifications/preferences
 * PATCH /api/notifications/preferences
 * 
 * Read and update the authenticated user's notification preferences.
 * Uses the session Supabase client (not admin).
 */
import { createClient } from "@/lib/supabase/server";
import type { NotificationPrefs, NotificationPrefsUpdate } from "@/lib/types/notifications";
import { error } from "console";

/**
 * GET - Return the authenticated user's notification preferences,
 * with defaults applied for any missing JSONB fields.
 */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();   
    if (!user) {
        return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
        .from("users")
        .select("notification_prefs")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    const prefs = (profile.notification_prefs ?? {}) as Partial<NotificationPrefs>;

    // Apply defaults for optional fields that may not exist in the DB JSONB
    const normalised: NotificationPrefs = {
        email_enabled: prefs.email_enabled ?? true,
        sms_enabled: prefs.sms_enabled ?? false,
        sms_phone: prefs.sms_phone ?? undefined,
        digest_frequency: prefs.digest_frequency ?? "realtime",
        quiet_hours_start: prefs.quiet_hours_start ?? "22:00",
        quiet_hours_end: prefs.quiet_hours_end ?? "07:00",
        monthly_digest: prefs.monthly_digest ?? true,
        reminder_days: prefs.reminder_days ?? [90, 30, 14, 7, 1],
        bounce_disabled: prefs.bounce_disabled ?? false,
        bounce_count: prefs.bounce_count ?? 0,
    };

    return Response.json(normalised);
}

/**
 * PATCH - Update the authenticated user's notification preferences.
 * Meges with existing JSONB (only changed fields).
 */
export async function PATCH(request: Request) {
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

    // Validate input
    const validation = validatePreferencesUpdate(body);
    if (!validation.valid) {
        return Response.json({ error: validation.error }, { status: 400 });
    }

    const sanitized = validation.sanitized!;

    // Fetch current prefs for merge
    const { data: profile, error: fetchError } = await supabase
        .from("users")
        .select("notification_prefs")
        .eq("id", user.id)
        .single();

    if (fetchError || !profile) {
        return Response.json({ error: "User profile not found" }, { status: 404 });
    }

    const currentPrefs = (profile.notification_prefs ?? {}) as NotificationPrefs;

    // Cross-field validation: SMS enabled requires phone number
    if (
        sanitized.sms_enabled === true &&
        !sanitized.sms_phone &&
        !currentPrefs.sms_phone
    ) {
        return Response.json(
            { error: "sms_phone is required when enabling SMS notifications" },
            { status: 400 }
        );
    }

    // If re-enabling email, reset bounce state
    const newPrefs: NotificationPrefs = { ...currentPrefs, ...sanitized };
    if (sanitized.email_enabled === true && currentPrefs.bounce_disabled) {
        newPrefs.bounce_disabled = false;
        newPrefs.bounce_count = 0;
    }

    const { error: updateError } = await supabase
        .from("users")
        .update({ notification_prefs: newPrefs })
        .eq("id", user.id);

    if (updateError) {
        return Response.json(
            { error: "Failed to update preferences" },
            { status: 500 }
        );
    }
    
    return Response.json({ ok: true, notification_prefs: newPrefs });
}

// ---------------------------------------
// Validation
// ---------------------------------------

interface ValidationResult {
    valid: boolean;
    error?: string;
    sanitized?: NotificationPrefsUpdate;
}

function validatePreferencesUpdate(body: unknown): ValidationResult {
    if (!body || typeof body !== "object") {
        return { valid: false, error: "Request body must be a JSON object" }; 
    }

    const input = body as Record<string, unknown>;
    const sanitized: NotificationPrefsUpdate = {};

    // email_enabled
    if ("email_enabled" in input) {
        if (typeof input.email_enabled !== "boolean") {
            return { valid: false, error: "email_enabled must be a boolean" };
        }
        sanitized.email_enabled = input.email_enabled;
    }

    // sms_phone: E.164 format
    if ("sms_phone" in input) {
        if (typeof input.sms_phone !== "string") {
            return { valid: false, error: "sms_phone must be a string" };
        }
        const e16Regex = /^\+[1-9]\d{6,14}$/;
        if (!e16Regex.test(input.sms_phone)) {
            return { valid: false, error: "sms_phone must be in E.164 format (e.g. +447700900000)" };
        }
        sanitized.sms_phone = input.sms_phone;
    }

    // digest frequency
    if ("digest_frequency" in input) {
        if (input.digest_frequency !== "realtime" && input.digest_frequency !== "daily") {
            return { valid: false, error: 'digest_frequency must be "realtime" or "daily"' };
        }
        sanitized.digest_frequency = input.digest_frequency;
    }

    // quiet_hours_start / quiet_hours_end
    for (const field of ["quiet_hours_start", "quiet_hours_end"] as const) {
        if (field in input) {
            if (typeof input[field] !== "string") {
                return { valid: false, error: `${field} must be a string` };
            }
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(input[field] as string)) {
                return { valid: false, error: `${field} must be in HH:MM format (e.g. "22:00")` };
            }
            sanitized[field] = input[field] as string;
        }
    }

    // monthly digest
    if ("monthly_digest" in input) {
        if (typeof input.monthly_digest !== "boolean") {
            return { valid: false, error: "monthly_digest must be a boolean" };
        }
        sanitized.monthly_digest = input.monthly_digest;
    }

    // reminder_days
    if ("reminder_days" in input) {
        if (!Array.isArray(input.reminder_days)) {
            return { valid: false, error: "reminder_days must be an array" };
        }
        const allowedDays = [90, 30, 14, 7, 1];
        for (const day of input.reminder_days) {
            if (typeof day !== "number" || !allowedDays.includes(day)) {
                return { valid: false, error: `reminder_days elements must be one of: ${allowedDays.join(",")}` };
            }
        }
        sanitized.reminder_days = [...new Set(input.reminder_days as number[])].sort(
            (a, b) => b - a
        );
    }

    // Reject unknown fields
    const allowedKeys = new Set([
        "email_enabled", "sms_enabled", "sms_phone", "digest_frequency",
        "quiet_hours_start", "quiet_hours_end", "monthly_digest", "reminder_days",
    ]);
    for (const key of Object.keys(input)) {
        if (!allowedKeys.has(key)) {
            return { valid: false, error: `Unknown field: ${key}` };
        }
    }

    if (Object.keys(sanitized).length === 0) {
        return { valid: false, error: "At least one field must be provided" };
    }

    return { valid: true, sanitized };
}
