"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TenantCard } from "@/components/tenant-card";
import { TenantForm } from "@/components/tenant-form";
import { deleteTenant } from "@/app/dashboard/properties/actions";
import type { Tenant } from "@/lib/types/tenants";

interface TenantSectionProps {
    propertyId: string;
    tenants: Tenant[];
}

export function TenantSection({ propertyId, tenants }: TenantSectionProps) {
    const router = useRouter();
    const [formMode, setFormMode] = useState<"closed" | "add" | "edit">("closed");
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const activeTenants = tenants.filter((t) => t.is_active);
    const pastTenants = tenants.filter((t) => !t.is_active);

    function closeForm() {
        setFormMode("closed");
        setEditingTenant(null);
    }

    function handleSuccess() {
        closeForm();
        router.refresh();
    }

    function startEdit(tenant: Tenant) {
        setEditingTenant(tenant);
        setFormMode("edit");
    }

    async function handleDelete(tenantId: string) {
        if (!confirm("Remove this tenant? This can't be undone from the UI.")) return;
        setDeletingId(tenantId);
        const result = await deleteTenant(tenantId);
        setDeletingId(null);
        if (result.error) {
            alert(result.error);
            return;
        }
        router.refresh();
    }

    return (
        <section className="space-y-4 mt-8">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Tenants</h2>
                {formMode === "closed" && (
                    <button
                        onClick={() => setFormMode("add")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        + Add Tenant
                    </button>
                )}
            </div>

            {formMode !== "closed" && (
                <TenantForm
                    propertyId={propertyId}
                    tenant={formMode === "edit" ? editingTenant ?? undefined : undefined}
                    onSuccess={handleSuccess}
                    onCancel={closeForm}
                />
            )}

            {activeTenants.length > 0 && (
                <div className="space-y-3">
                    {pastTenants.length > 0 && (
                        <h3 className="text-sm font-medium text-gray-600">Active</h3>
                    )}
                    {activeTenants.map((tenant) => (
                        <TenantCard
                            key={tenant.id}
                            tenant={tenant}
                            onEdit={() => startEdit(tenant)}
                            onDelete={() => handleDelete(tenant.id)}
                        />
                    ))}
                </div>
            )}

            {pastTenants.length > 0 && (
                <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-gray-600">
                        Past Tenants ({pastTenants.length})
                    </summary>
                    <div className="space-y-3 mt-3">
                        {pastTenants.map((tenant) => (
                            <TenantCard key={tenant.id} tenant={tenant} />
                        ))}
                    </div>
                </details>
            )}

            {activeTenants.length === 0 && pastTenants.length === 0 && formMode === "closed" && (
                <p className="text-gray-500 text-sm py-4">
                    No tenants yet. Click &ldquo;Add Tenant&rdquo; to get started.
                </p>
            )}

            {deletingId && (
                <p className="text-sm text-gray-500">Removing tenant…</p>
            )}
        </section>
    );
}
