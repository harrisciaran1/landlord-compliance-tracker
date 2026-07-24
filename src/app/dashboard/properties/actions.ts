"use server"

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultComplianceItems, PropertyType } from "@/lib/compliance_templates";
import { calculateExpiryDate, type ComplianceType } from "@/lib/expiry-engine";

export async function createProperty(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    const address_line1 = formData.get("address_line1") as string;
    const address_line2 = formData.get("address_line2") as string;
    const city = formData.get("city") as string;
    const postcode = formData.get("postcode") as string;
    const property_type = formData.get("property_type") as PropertyType;
    const num_bedrooms = formData.get("num_bedrooms") as string;
    const council_area = formData.get("council_area") as string;
    const notes = formData.get("notes") as string;

    if (!address_line1 || !city || !postcode || !property_type) {
        return { error: "Address, city, postcode, and property type are required" };
    }

    const { data: property, error } = await supabase
        .from("properties")
        .insert({
            org_id: profile.org_id,
            address_line1,
            address_line2: address_line2 || null,
            city,
            postcode,
            property_type,
            num_bedrooms: num_bedrooms ? parseInt(num_bedrooms) : null,
            council_area: council_area || null,
            notes: notes || null,
        })
        .select("id")
        .single();

    if (error) return { error: error.message };

    //Create default compliance items based on property type
    // NOTE: deposit_protection is NOT included - it's tenant-linked (Week 4)
    const defaultTypes = getDefaultComplianceItems(property_type);
    const items = defaultTypes.map((type) => ({
        property_id: property.id,
        type,
        status: "unknown",
        is_recurring: true,
    }));

    await supabase.from("compliance_items").insert(items);

    revalidatePath("/dashboard");
    redirect(`/dashboard/properties/${property.id}`);
}

export async function updateComplianceItem(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const itemId = formData.get("item_id") as string;
    const issueDate = formData.get("issue_date") as string;
    const certificateNumber = formData.get("certificate_number") as string;
    const contractorName = formData.get("contractor_name") as string;
    const contractorPhone = formData.get("contractor_phone") as string;
    const notes = formData.get("notes") as string;
    const type = formData.get("type") as ComplianceType;
    const previousExpiryDate = formData.get("previous_expiry_date") as string;
    const manualExpiryDate = formData.get("manual_expiry_date") as string;

    const updates: Record<string, unknown> = {
        certificate_number: certificateNumber || null,
        contractor_name: contractorName || null,
        contractor_phone: contractorPhone || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
    };

    // H2: fire_risk_assessment uses manual expiry date (assessors-defined)
    if (type === "fire_risk_assessment" && manualExpiryDate) {
        updates.issue_date = issueDate || null;
        updates.expiry_date = manualExpiryDate;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(manualExpiryDate);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) updates.status = "expired";
        else if (diffDays <= 30) updates.status = "expiring";
        else updates.status = "valid";
    } else if (issueDate) {
        updates.issue_date = issueDate;
        const expiryDate = calculateExpiryDate({
            type,
            issueDate,
            previousExpiryDate: previousExpiryDate || null,
        });
        updates.expiry_date = expiryDate;

        if (expiryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const expiry = new Date(expiryDate);
            const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) updates.status = "expired";
            else if (diffDays <= 30) updates.status = "expiring";
            else updates.status = "valid";
        }

        // Store previous expiry for gas safety anniversary rule
        if (type === "gas_safety" && updates.expiry_date) {
            updates.previous_expiry_date = updates.expiry_date;
        }
    }

    const { error } = await supabase
        .from("compliance_items")
        .update(updates)
        .eq("id", itemId);

    if (error) return { error: error .message };

    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteProperty(propertyId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
        .from("properties")
        .update({ is_archived: true })
        .eq("id", propertyId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    redirect("/dashboard");
}

// ================================================================
// DOCUMENT ACTIONS (Week 3)
// ================================================================

/**
 *  Confirm a document upload after the client has PUT the file to storage.
 *  Updates the pending document row to set uploaded_at
 */
export async function confirmDocumentUpload(documentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    
    if (!documentId) return { error: "Document ID is required" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    // Verify ownership: document -> compliance_item -> property -> org
    const { data: doc } = await supabase
        .from("documents")
        .select("id, file_path, uploaded_at, compliance_items!inner(property_id, properties(id, org_id))")
        .eq("id", documentId)
        .is("uploaded_at", null)
        .single();

    if (!doc) return { error: "Document not found or already confirmed" };

    // Check org ownership
    const compItem = doc.compliance_items as unknown as {
        property_id: string;
        properties: { id: string; org_id: string };
    };
    if (compItem.properties.org_id !== profile.org_id) {
        return { error: "Access denied" };
    }

    // Verify file exists in storage (defensive check)
    const pathParts = doc.file_path.split("/");
    const fileName = pathParts.pop()!;
    const folder = pathParts.join("/");
    const { data: files } = await supabase.storage
        .from("compliance-documents")
        .list(folder, { search: fileName });

    if (!files || files.length === 0) {
        // Clean up orphan row
        await supabase.from("documents").delete().eq("id", documentId);
        return { error: "Upload verification failed. Please try again."};
    }

    // Mark as uploaded
    const { error } = await supabase
        .from("documents")
        .update({ uploaded_at: new Date().toISOString() })
        .eq("id", documentId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/properties/${compItem.property_id}`);
    revalidatePath("/dashboard");
    return { success: true };
}

/**
 *  Generate a signed download URL for a document (15-minute expiry).
 */
export async function getDocumentDownloadUrl(documentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Document ID is required" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    // Verify ownership and that document is uploaded (not pending)
    const { data: doc } = await supabase
        .from("documents")
        .select("id, file_path, file_name, mime_type, compliance_items!inner(property_id, properties!inner(id, org_id))")
        .eq("id", documentId)
        .not("uploaded_at", "is", null)
        .single();

    if (!doc) return { error: "Document not found" };

    const compItem = doc.compliance_items as unknown as {
        property_id: string;
        properties: { id: string; org_id: string };
    };
    if (compItem.properties.org_id !== profile.org_id) {
        return { error: "Access denied" };
    }

    // Generate signed URL (15 minutes = 900 seconds)
    const { data, error } = await supabase.storage
        .from("compliance-documents")
        .createSignedUrl(doc.file_path, 900);

    if (error || !data) {
        return { error: "Failed to generate download URL" };
    }

    return { url: data.signedUrl, mime_type: doc.mime_type, file_name: doc.file_name };
}

/** 
 * Delete a document from storage and database.
 */
export async function deleteDocument(documentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    if (!documentId) return { error: "Document ID is required" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    // Verify ownership
    const { data: doc } = await supabase
        .from("documents")
        .select("id, file_path, compliance_items!inner(property_id, properties!inner(id, org_id))")
        .eq("id", documentId)
        .single();

    if (!doc) return { error: "Document not found" };

    const compItem = doc.compliance_items as unknown as {
        property_id: string;
        properties: { id: string; org_id: string };
    };
    if (compItem.properties.org_id !== profile.org_id) {
        return { error: "Access denied" };
    }

    // Delete from storage (best-effort - log errors but don't fail)
    const { error: storageError } = await supabase.storage
        .from("compliance-documents")
        .remove([doc.file_path]);

    if (storageError) {
        console.warn("Storage deletion failed:", storageError.message);
    }

    // Delete from database
    const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

    if (dbError) return { error: "Failed to delete document" };

    revalidatePath(`/dashboard/properties/${compItem.property_id}`);
    revalidatePath("/dashboard");
    return { success: true};
}