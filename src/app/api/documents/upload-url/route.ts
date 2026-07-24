import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateFile, generateStoragePath } from "@/lib/documents";
import type { UploadUrlResponse, UploadUrlErrorResponse } from "@/lib/types/api";
import { error } from "console";

/**
 * POST /api/documents/upload-url
 * 
 * Generates a signed URL for direct browser-to-storage upload.
 * 
 * Security:
 * - CSRF: Checks Origin header matches NEXT_PUBLIC_APP_URL OR X-Requested-With: XMLHttpRequest
 * - Auth: Requires authenticated user via supabase.auth.getUser()
 * - Ownership: Verifies user's org_id owns the compliance item
 * - Path traversal: sanitizeFileName called internally by generateStoragePath
 */

export async function POST(
    request: NextRequest
): Promise<NextResponse<UploadUrlResponse | UploadUrlErrorResponse>> {
    //1. CSRF check
    const origin = request.headers.get("origin");
    const xRequestWith = request.headers.get("x-requested-with");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (origin != appUrl && xRequestWith !== "XMLHttpRequest") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse and validate request body
    let body: { compliance_item_id?: string; file_name?: string; mime_type?: string; file_size?: number };
    try{
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { compliance_item_id, file_name, mime_type, file_size } = body;

    if (!compliance_item_id) {
        return NextResponse.json({ error: "compliance_item_id is required" }, { status: 400});
    }

    if (!file_name || !mime_type || file_size === undefined ) {
        return NextResponse.json({ error: "file_name, mime_type, and file_size are required" }, { status: 400});
    }

    const validation = validateFile(file_name, mime_type, file_size);
    if (!validation.valid) {
        const status = validation.error?.includes("size") ? 413 : 400;
        return NextResponse.json({ error: validation.error! }, { status });
    }

    // 3. Authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 4. Get user's org_id
    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return NextResponse.json({ error: "User profile not found" }, { status: 401});
    }

    // 5. Verify ownership: compliance_item -> property -> org_id
    const { data: itemData } = await supabase
        .from("compliance_items")
        .select("id, type, property_id, properties!inner(id, org_id)")
        .eq("id", compliance_item_id)
        .single();

    if (!itemData) {
        return NextResponse.json({ error: "Compliance item not found" }, { status: 404});
    }

    // Type assertion for the nested join result
    const property = itemData.properties as unknown as { id: string; org_id: string };
    if (property.org_id !== profile.org_id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 6. Compute next version number
    const { data: versionData } = await supabase
        .from("documents")
        .select("version")
        .eq("compliance_item_id", compliance_item_id)
        .order("version", { ascending: false})
        .limit(1)
        .single();

    const nextVersion = (versionData?.version ?? 0) + 1;

    // 7. Generate storage path
    let storagePath: string;
    try {
        storagePath = generateStoragePath(
            profile.org_id,
            property.id,
            itemData.type,
            file_name
        );
    } catch {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400});
    }

    // 8. Create signed upload URL
    const { data: signedData, error: storageError } = await supabase.storage
        .from("compliance-documents")
        .createSignedUploadUrl(storagePath);

    if (storageError || !signedData) {
        console.error("Storage signed URL error:", storageError?.message);
        return NextResponse.json(
            { error: "Failed to create upload URL" },
            { status: 500 }
        );
    }

    // 9. Insert pending document row (uploaded_at: null)
    const { data: docRow, error: insertError } = await supabase
        .from("documents")
        .insert({
            compliance_item_id,
            file_path: storagePath,
            file_name,
            file_size,
            mime_type,
            version: nextVersion,
            // uploaded_at is null by default - marks as pending
        })
        .select("id")
        .single();

    if (insertError || !docRow) {
        console.error("Document insert error:", insertError?.message);
        return NextResponse.json(
            { error: "Failed to register document" },
            { status: 500 }
        );
    }

    // 10. Return success response
    return NextResponse.json({
        upload_url: signedData.signedUrl,
        upload_token: signedData.token,
        document_id: docRow.id,
        path: storagePath,
    });
}