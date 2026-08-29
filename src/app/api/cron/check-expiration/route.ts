/**
 * GET /api/cron/check-expirations
 * 
 * Daily expiry reminder dispatch - the core cron endpoint.
 * Triggered by Vercel Cron at 06:00 UTC (07:00 BST / 06:00 GMT).
 * 
 * Authenticates via CRON_SECRET, creates an admin Supabase client
 *  (service role key), and runs the full notification pipeline.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { runExpiryCheckPipeline } from "@/lib/notifications/dispatcher";

export async function GET(request: Request) {
    // Verify cron auth
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        const adminClient = createAdminClient();
        const summary = await runExpiryCheckPipeline(adminClient);

        return Response.json({
            ok: true,
            summary,
            durationMs: Date.now() - startTime,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[check-expirations] Pipeline failed:", message);

        return Response.json(
            { error: "Pipeline failed", message },
            { status: 500 }
        );
    }
}