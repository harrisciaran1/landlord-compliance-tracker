/**
 * End-to-end verification against the LOCAL Supabase stack.
 *
 * Signs in as a real test user using the anon key, so every query goes
 * through Postgres grants and RLS exactly as the app does. Uses the real
 * crypto and expiry-engine modules rather than reimplementing them.
 *
 * Run with:  npm run verify:local
 * Requires:  npx supabase start
 *
 * What this DOES cover:
 *   - table grants (the "permission denied for table properties" class of bug)
 *   - RLS policies, including cross-org isolation
 *   - PII encryption round-trip, and that ciphertext really is stored
 *   - deposit deadline calculation
 *   - schema constraints
 *
 * What this does NOT cover:
 *   - Next.js server action logic (actions.ts is not imported here)
 *   - form wiring, e.g. a mis-named hidden input
 *   Those need browser-level tests to catch.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import { encrypt, decrypt } from "../src/lib/crypto";
import { calculateDepositDeadline } from "../src/lib/expiry-engine";

// supabase-js constructs a realtime client eagerly, which needs a WebSocket.
// Node 20 has none natively (Node 22+ does), so supply `ws`.
const clientOptions = {
    realtime: { transport: ws as unknown as never },
    auth: { persistSession: false, autoRefreshToken: false },
} as const;

// ---------------------------------------------------------------- helpers

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail?: string) {
    checks++;
    if (condition) {
        console.log(`  PASS  ${label}`);
    } else {
        failures++;
        console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
    }
}

function section(title: string) {
    console.log(`\n${title}`);
}

/** Read a single key out of .env.local without pulling in a dep. */
function readEnvLocal(key: string): string | null {
    try {
        const content = readFileSync(".env.local", "utf8");
        const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
        return match ? match[1].trim() : null;
    } catch {
        return null;
    }
}

/** Pull local stack credentials from the Supabase CLI. */
function getLocalCredentials(): { url: string; anonKey: string } {
    const raw = execSync("npx supabase status -o env", { encoding: "utf8" });
    const pick = (key: string) => {
        const m = raw.match(new RegExp(`^${key}="(.*)"$`, "m"));
        return m ? m[1] : null;
    };
    const url = pick("API_URL");
    const anonKey = pick("ANON_KEY");
    if (!url || !anonKey) {
        throw new Error(
            "Could not read API_URL/ANON_KEY from `supabase status`. Is the local stack running? Try: npx supabase start"
        );
    }
    return { url, anonKey };
}

/**
 * Sign in, or sign up then sign in. Mirrors the app's signup() flow:
 * create org via RPC, then put org_id/role on user_metadata.
 *
 * Signs in a second time after updating metadata, because RLS policies read
 * org_id from the JWT and the token issued before the update won't carry it.
 */
async function ensureUser(
    url: string,
    anonKey: string,
    email: string,
    password: string,
    fullName: string
): Promise<{ client: SupabaseClient; orgId: string; userId: string }> {
    const client = createClient(url, anonKey, clientOptions);

    const signIn = await client.auth.signInWithPassword({ email, password });

    let user = signIn.data.user;

    if (signIn.error || !user) {
        const signUp = await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });
        if (signUp.error || !signUp.data.user) {
            throw new Error(`Signup failed: ${signUp.error?.message}`);
        }
        user = signUp.data.user;
    }

    const userId = user.id;
    let orgId = (user.user_metadata as Record<string, unknown>)?.org_id as string | undefined;

    if (!orgId) {
        const { data: newOrgId, error: rpcError } = await client.rpc("create_user_org", {
            user_id: userId,
            user_email: email,
            user_name: fullName,
            org_name: `${fullName}'s Properties`,
        });
        if (rpcError || !newOrgId) {
            throw new Error(`create_user_org failed: ${rpcError?.message}`);
        }
        orgId = newOrgId as string;

        const { error: updateError } = await client.auth.updateUser({
            data: { full_name: fullName, org_id: orgId, role: "owner" },
        });
        if (updateError) throw new Error(`updateUser failed: ${updateError.message}`);

        // Fresh sign-in so the JWT carries org_id/role for RLS.
        const reAuth = await client.auth.signInWithPassword({ email, password });
        if (reAuth.error) throw new Error(`Re-signin failed: ${reAuth.error.message}`);
    }

    return { client, orgId: orgId!, userId };
}

// ---------------------------------------------------------------- main

async function main() {
    console.log("Local end-to-end verification\n" + "=".repeat(60));

    const encryptionKey = process.env.ENCRYPTION_KEY ?? readEnvLocal("ENCRYPTION_KEY");
    if (!encryptionKey || encryptionKey.length !== 64) {
        throw new Error(
            "ENCRYPTION_KEY must be a 64-character hex string. Set it in .env.local (openssl rand -hex 32)."
        );
    }
    process.env.ENCRYPTION_KEY = encryptionKey;

    const { url, anonKey } = getLocalCredentials();
    console.log(`Target: ${url} (local stack)`);

    // -------------------------------------------------- crypto (pure)
    section("Encryption module");

    const secret = "John Smith <john@example.com> 07700900123";
    const ciphertext = encrypt(secret);
    check("encrypt() returns a value", !!ciphertext);
    check("ciphertext differs from plaintext", ciphertext !== secret);
    check("decrypt() round-trips", decrypt(ciphertext) === secret);
    check("encrypt(null) returns null", encrypt(null) === null);
    check(
        "distinct IVs produce distinct ciphertext",
        encrypt(secret) !== encrypt(secret)
    );

    let tamperDetected = false;
    try {
        decrypt(ciphertext!.slice(0, -4) + "XXXX");
    } catch {
        tamperDetected = true;
    }
    check("tampered ciphertext is rejected", tamperDetected);

    // -------------------------------------------------- auth + org
    section("Authentication and organisation");

    const stamp = Date.now();
    const userA = await ensureUser(
        url,
        anonKey,
        "verify-a@example.com",
        "test-password-a-123",
        "Test User A"
    );
    check("user A signed in with org_id", !!userA.orgId);

    const { data: claims } = await userA.client.auth.getSession();
    const token = claims.session?.access_token;
    let jwtOrgId: string | undefined;
    if (token) {
        const payload = JSON.parse(
            Buffer.from(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
        );
        jwtOrgId = payload?.user_metadata?.org_id;
    }
    check(
        "JWT carries org_id claim (required by RLS)",
        jwtOrgId === userA.orgId,
        `jwt=${jwtOrgId} expected=${userA.orgId}`
    );

    // -------------------------------------------------- property insert
    section("Property creation (grants + RLS)");

    const { data: property, error: propError } = await userA.client
        .from("properties")
        .insert({
            org_id: userA.orgId,
            address_line1: `42 Baker Street #${stamp}`,
            address_line2: "Flat 3",
            city: "London",
            postcode: "NW1 6XE",
            property_type: "single_let",
            num_bedrooms: 2,
            council_area: "Westminster",
        })
        .select("id, council_area")
        .single();

    check("property insert succeeded", !propError && !!property, propError?.message);
    if (!property) throw new Error("Cannot continue without a property");

    check("council_area persisted", property.council_area === "Westminster", `got ${property.council_area}`);

    // -------------------------------------------------- tenant insert
    section("Tenant creation with encrypted PII");

    const tenantName = "Jane Tenant";
    const tenantEmail = "jane@example.com";
    const tenantPhone = "07700 900123";
    const tenancyStart = "2026-01-15";
    const depositPence = 150000;

    const { data: tenant, error: tenantError } = await userA.client
        .from("tenants")
        .insert({
            property_id: property.id,
            org_id: userA.orgId,
            name_encrypted: encrypt(tenantName)!,
            email_encrypted: encrypt(tenantEmail),
            phone_encrypted: encrypt(tenantPhone),
            tenancy_start: tenancyStart,
            deposit_amount_pence: depositPence,
            deposit_scheme: "dps",
            deposit_protected_date: tenancyStart,
            is_active: true,
        })
        .select("id, name_encrypted, email_encrypted, phone_encrypted")
        .single();

    check("tenant insert succeeded", !tenantError && !!tenant, tenantError?.message);
    if (!tenant) throw new Error("Cannot continue without a tenant");

    check(
        "stored name is NOT plaintext",
        tenant.name_encrypted !== tenantName && !tenant.name_encrypted.includes("Jane")
    );
    check("stored name looks like base64", /^[A-Za-z0-9+/=]+$/.test(tenant.name_encrypted));
    check("name decrypts correctly", decrypt(tenant.name_encrypted) === tenantName);
    check("email decrypts correctly", decrypt(tenant.email_encrypted) === tenantEmail);
    check("phone decrypts correctly", decrypt(tenant.phone_encrypted) === tenantPhone);

    // -------------------------------------------------- deposit deadline
    section("Deposit protection deadline");

    const expectedDeadline = calculateDepositDeadline(tenancyStart);
    check("deadline is 30 days after tenancy start", expectedDeadline === "2026-02-14", `got ${expectedDeadline}`);

    // -------------------------------------------------- cross-org isolation
    section("Cross-org isolation (RLS)");

    const userB = await ensureUser(
        url,
        anonKey,
        "verify-b@example.com",
        "test-password-b-123",
        "Test User B"
    );
    check("user B has a different org", userB.orgId !== userA.orgId);

    const { data: leakedProps } = await userB.client
        .from("properties")
        .select("id")
        .eq("id", property.id);
    check("user B cannot read user A's property", (leakedProps?.length ?? 0) === 0);

    const { data: leakedTenants } = await userB.client
        .from("tenants")
        .select("id")
        .eq("id", tenant.id);
    check("user B cannot read user A's tenant", (leakedTenants?.length ?? 0) === 0);

    const { error: hijackError } = await userB.client
        .from("properties")
        .update({ city: "Hijacked" })
        .eq("id", property.id)
        .select("id");
    const { data: stillIntact } = await userA.client
        .from("properties")
        .select("city")
        .eq("id", property.id)
        .single();
    check(
        "user B cannot modify user A's property",
        stillIntact?.city === "London",
        `city is now ${stillIntact?.city}, updateError=${hijackError?.message ?? "none"}`
    );

    // -------------------------------------------------- cleanup
    section("Cleanup");
    await userA.client.from("tenants").delete().eq("id", tenant.id);
    const { error: cleanupError } = await userA.client
        .from("properties")
        .delete()
        .eq("id", property.id);
    check("test data removed", !cleanupError, cleanupError?.message);

    // -------------------------------------------------- summary
    console.log("\n" + "=".repeat(60));
    if (failures === 0) {
        console.log(`All ${checks} checks passed.`);
    } else {
        console.error(`${failures} of ${checks} checks FAILED.`);
        process.exitCode = 1;
    }
}

main().catch((err) => {
    console.error(`\nAborted: ${err.message}`);
    process.exitCode = 1;
});
