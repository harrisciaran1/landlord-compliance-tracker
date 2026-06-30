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
    const defaultTypes = getDefaultComplianceItems(property_type);
    const items = defaultTypes.map((type) => ({
        property_id: property.id,
        type,
        status: "unknown",
        is_recurring: type !== "deposit_protection",
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

    const updates: Record<string, unknown> = {
        certificate_number: certificateNumber || null,
        contractor_name: contractorName || null,
        contractor_phone: contractorPhone || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
    };

    if (issueDate) {
        updates.issue_date = issueDate;
        const expiryDate = calculateExpiryDate({
            type,
            issueDate,
            previousExpiryDate: previousExpiryDate || null,
        });
        updates.expiry_date = expiryDate;

        // Calculate status
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