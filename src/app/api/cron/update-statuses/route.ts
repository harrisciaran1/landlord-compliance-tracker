/**
 * GET /api/cron/update-statuses
 * 
 * Daily recalculation of all compliance_items status.
 * Backup to the pg_cron job in migration 00001.
 * Runs at 05:00 UTC - before check-expiration so statuses are fresh
 */
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
    // Verify cron auth
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const adminClient = createAdminClient();
        const { data, error } = await adminClient.rpc("update_compliance_statuses");

        if (error) {
            console.error("[update-statuses] RPC failed:", error.message);
            return Response.json(
                { error: "Status update failed", message: error.message },
                { status: 500 }
            );
        }

        return Response.json({ ok: true, updated: data ?? 0 });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[update-statuses] Failed:", message);
        return Response.json(
            { error: "Statuses update failed", message },
            { status: 500 }
        );
    }
}