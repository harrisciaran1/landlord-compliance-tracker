/**
 * GET /api/cron/monthly-digest
 * 
 * Monthly compliance summary email.
 * Runs every Monday at 06:00 UTC; only processe on the first Monday 
 * of the month (day 1-7). Skips other Mondays with a 200 response.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getUkLocalDate } from "@/lib/notifications/timezone";
import { runMonthlyDigestPipeline } from "@/lib/notifications/dispatcher";

export async function GET(request: Request) {
    // Verify cron auth
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if it's the first Monday of the month (day 1-7)
    const ukDate = getUkLocalDate();
    const dayOfMonth = parseInt(ukDate.split("-")[2], 10);

    if (dayOfMonth > 7) {
        return Response.json({
            ok: true,
            sent: 0,
            skipped: 0,
            reason: `Not first Monday of month (day ${dayOfMonth})`,
        });
    }

    try {
        const adminClient = createAdminClient();
        const { sent, skipped } = await runMonthlyDigestPipeline(adminClient);

        return Response.json({ ok: true, sent, skipped });
    }   catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[monthly-digest] Pipeline failed:", message);
        return Response.json(
            { error: "Digest pipeline failed", message },
            { status: 500 }
        );
    }
}