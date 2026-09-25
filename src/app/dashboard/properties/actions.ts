"use server"

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDefaultComplianceItems, PropertyType } from "@/lib/compliance_templates";
import { calculateExpiryDate, calculateDepositDeadline, calculateStatusFromExpiry, type ComplianceType } from "@/lib/expiry-engine";
import { encrypt, decrypt } from "@/lib/crypto";
import type { Tenant, TenantRow, DepositScheme } from "@/lib/types/tenants";

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
// ================================================================
// TENANT ACTIONS (Week 4)
// ================================================================

/**
 * Sync the deposit_protection compliance item for a property based on
 * its currently active tenant. Creates, updates, or removes the item
 * depending on whether an active tenant with a deposit exists.
 */
async function syncDepositProtectionItem(
    supabase: Awaited<ReturnType<typeof createClient>>,
    propertyId: string,
    tenant: {
        name: string;
        tenancy_start: string;
        deposit_amount_pence: number | null;
        deposit_scheme: DepositScheme | null;
        deposit_protected_date: string | null;
        is_active: boolean;
    }
) {
    const hasDeposit = tenant.is_active && !!tenant.deposit_amount_pence && tenant.deposit_amount_pence > 0;

    const { data: existingItem } = await supabase
        .from("compliance_items")
        .select("id")
        .eq("property_id", propertyId)
        .eq("type", "deposit_protection")
        .maybeSingle();

    if (!hasDeposit) {
        if (existingItem) {
            await supabase.from("compliance_items").delete().eq("id", existingItem.id);
        }
        return;
    }

    const expiryDate = calculateDepositDeadline(tenant.tenancy_start);
    const status = calculateStatusFromExpiry(expiryDate);
    const depositPounds = ((tenant.deposit_amount_pence ?? 0) / 100).toFixed(2);

    const itemData = {
        property_id: propertyId,
        type: "deposit_protection" as const,
        status,
        issue_date: tenant.deposit_protected_date || null,
        expiry_date: expiryDate,
        notes: `Tenant: ${tenant.name} | Deposit: £${depositPounds} | Scheme: ${tenant.deposit_scheme ?? "unknown"}`,
        is_recurring: false,
    };

    if (existingItem) {
        await supabase.from("compliance_items").update(itemData).eq("id", existingItem.id);
    } else {
        await supabase.from("compliance_items").insert(itemData);
    }
}

function parseTenantFormData(formData: FormData) {
    const depositAmountRaw = formData.get("deposit_amount_pence") as string;

    return {
        name: (formData.get("name") as string) || "",
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        tenancy_start: (formData.get("tenancy_start") as string) || "",
        tenancy_end: (formData.get("tenancy_end") as string) || null,
        deposit_amount_pence: depositAmountRaw ? parseInt(depositAmountRaw, 10) : null,
        deposit_scheme: (formData.get("deposit_scheme") as DepositScheme) || null,
        deposit_protected_date: (formData.get("deposit_protected_date") as string) || null,
        prescribed_info_served: formData.get("prescribed_info_served") === "true",
        prescribed_info_date: (formData.get("prescribed_info_date") as string) || null,
        how_to_rent_served: formData.get("how_to_rent_served") === "true",
        how_to_rent_date: (formData.get("how_to_rent_date") as string) || null,
        right_to_rent_checked: formData.get("right_to_rent_checked") === "true",
        right_to_rent_date: (formData.get("right_to_rent_date") as string) || null,
        is_active: formData.get("is_active") === "true",
    };
}

/**
 * Create a new tenant with encrypted PII.
 * If active and has a deposit, syncs the deposit_protection compliance item.
 */
export async function createTenant(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    const propertyId = formData.get("property_id") as string;
    const fields = parseTenantFormData(formData);

    if (!fields.name || !fields.tenancy_start || !propertyId) {
        return { error: "Name, tenancy start date, and property are required" };
    }

    // Verify property belongs to user's org
    const { data: property } = await supabase
        .from("properties")
        .select("id, org_id")
        .eq("id", propertyId)
        .eq("org_id", profile.org_id)
        .single();

    if (!property) {
        return { error: "Property not found or access denied" };
    }

    const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
            property_id: propertyId,
            org_id: profile.org_id,
            name_encrypted: encrypt(fields.name)!,
            email_encrypted: encrypt(fields.email),
            phone_encrypted: encrypt(fields.phone),
            tenancy_start: fields.tenancy_start,
            tenancy_end: fields.tenancy_end,
            deposit_amount_pence: fields.deposit_amount_pence,
            deposit_scheme: fields.deposit_scheme,
            deposit_protected_date: fields.deposit_protected_date,
            prescribed_info_served: fields.prescribed_info_served,
            prescribed_info_date: fields.prescribed_info_date,
            how_to_rent_served: fields.how_to_rent_served,
            how_to_rent_date: fields.how_to_rent_date,
            right_to_rent_checked: fields.right_to_rent_checked,
            right_to_rent_date: fields.right_to_rent_date,
            is_active: fields.is_active,
        })
        .select("id")
        .single();

    if (tenantError) return { error: tenantError.message };

    await syncDepositProtectionItem(supabase, propertyId, fields);

    revalidatePath(`/dashboard/properties/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true, tenantId: tenant.id };
}

/**
 * Update an existing tenant, re-encrypting PII and re-syncing the
 * deposit_protection compliance item.
 */
export async function updateTenant(tenantId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    const { data: existingTenant } = await supabase
        .from("tenants")
        .select("id, property_id, org_id")
        .eq("id", tenantId)
        .eq("org_id", profile.org_id)
        .single();

    if (!existingTenant) {
        return { error: "Tenant not found or access denied" };
    }

    const fields = parseTenantFormData(formData);

    if (!fields.name || !fields.tenancy_start) {
        return { error: "Name and tenancy start date are required" };
    }

    const { error: updateError } = await supabase
        .from("tenants")
        .update({
            name_encrypted: encrypt(fields.name)!,
            email_encrypted: encrypt(fields.email),
            phone_encrypted: encrypt(fields.phone),
            tenancy_start: fields.tenancy_start,
            tenancy_end: fields.tenancy_end,
            deposit_amount_pence: fields.deposit_amount_pence,
            deposit_scheme: fields.deposit_scheme,
            deposit_protected_date: fields.deposit_protected_date,
            prescribed_info_served: fields.prescribed_info_served,
            prescribed_info_date: fields.prescribed_info_date,
            how_to_rent_served: fields.how_to_rent_served,
            how_to_rent_date: fields.how_to_rent_date,
            right_to_rent_checked: fields.right_to_rent_checked,
            right_to_rent_date: fields.right_to_rent_date,
            is_active: fields.is_active,
            updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

    if (updateError) return { error: updateError.message };

    const propertyId = existingTenant.property_id;
    if (propertyId) {
        await syncDepositProtectionItem(supabase, propertyId, fields);
        revalidatePath(`/dashboard/properties/${propertyId}`);
    }
    revalidatePath("/dashboard");
    return { success: true };
}

/**
 * Soft-delete a tenant: mark inactive, clear property link, set tenancy_end
 * if not already set, and remove the deposit_protection compliance item.
 */
export async function deleteTenant(tenantId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "User profile not found" };

    const { data: tenant } = await supabase
        .from("tenants")
        .select("property_id, tenancy_end")
        .eq("id", tenantId)
        .eq("org_id", profile.org_id)
        .single();

    if (!tenant) {
        return { error: "Tenant not found or access denied" };
    }

    const propertyId = tenant.property_id;

    const { error: deleteError } = await supabase
        .from("tenants")
        .update({
            is_active: false,
            property_id: null,
            tenancy_end: tenant.tenancy_end || new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);

    if (deleteError) return { error: deleteError.message };

    if (propertyId) {
        await supabase
            .from("compliance_items")
            .delete()
            .eq("property_id", propertyId)
            .eq("type", "deposit_protection");

        revalidatePath(`/dashboard/properties/${propertyId}`);
    }
    revalidatePath("/dashboard");
    return { success: true };
}

/**
 * Get all tenants (active + past) for a property with decrypted PII.
 */
export async function getTenantsForProperty(propertyId: string): Promise<Tenant[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

    if (!profile) return [];

    const { data: property } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("org_id", profile.org_id)
        .single();

    if (!property) return [];

    const { data: tenantRows } = await supabase
        .from("tenants")
        .select("*")
        .eq("property_id", propertyId)
        .order("tenancy_start", { ascending: false });

    if (!tenantRows) return [];

    return (tenantRows as TenantRow[]).map((row) => {
        const { name_encrypted, email_encrypted, phone_encrypted, ...rest } = row;
        return {
            ...rest,
            name: decrypt(name_encrypted)!,
            email: decrypt(email_encrypted),
            phone: decrypt(phone_encrypted),
        };
    });
}
