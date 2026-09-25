"use client";

import { useState } from "react";
import { createTenant, updateTenant } from "@/app/dashboard/properties/actions";
import type { Tenant } from "@/lib/types/tenants";
import { DEPOSIT_SCHEME_LABELS } from "@/lib/types/tenants";

interface TenantFormProps {
    propertyId: string;
    tenant?: Tenant;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function TenantForm({ propertyId, tenant, onSuccess, onCancel }: TenantFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!tenant;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        formData.set("property_id", propertyId);

        const result = isEditing
            ? await updateTenant(tenant.id, formData)
            : await createTenant(formData);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            onSuccess?.();
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">
                    {isEditing ? "Edit Tenant" : "Add Tenant"}
                </h3>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Close form"
                        className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    >
                        ✕
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
                    {error}
                </div>
            )}

            {/* Personal Details */}
            <div className="space-y-3">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        name="name"
                        defaultValue={tenant?.name}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        defaultValue={tenant?.email ?? ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-1">
                        Phone
                    </label>
                    <input
                        id="phone"
                        type="tel"
                        name="phone"
                        defaultValue={tenant?.phone ?? ""}
                        placeholder="07700 900123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* Tenancy Details */}
            <div className="space-y-3 pt-4 border-t">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="tenancy_start" className="block text-sm font-medium mb-1">
                            Tenancy Start <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="tenancy_start"
                            type="date"
                            name="tenancy_start"
                            defaultValue={tenant?.tenancy_start}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div>
                        <label htmlFor="tenancy_end" className="block text-sm font-medium mb-1">
                            Tenancy End
                        </label>
                        <input
                            id="tenancy_end"
                            type="date"
                            name="tenancy_end"
                            defaultValue={tenant?.tenancy_end ?? ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="deposit_amount_pence" className="block text-sm font-medium mb-1">
                        Deposit Amount (pence)
                    </label>
                    <input
                        id="deposit_amount_pence"
                        type="number"
                        name="deposit_amount_pence"
                        defaultValue={tenant?.deposit_amount_pence ?? ""}
                        min={0}
                        step={1}
                        placeholder="150000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Enter amount in pence, e.g. 150000 = £1500.00
                    </p>
                </div>

                <div>
                    <label htmlFor="deposit_scheme" className="block text-sm font-medium mb-1">
                        Deposit Scheme
                    </label>
                    <select
                        id="deposit_scheme"
                        name="deposit_scheme"
                        defaultValue={tenant?.deposit_scheme ?? ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="">-- Select Scheme --</option>
                        {Object.entries(DEPOSIT_SCHEME_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="deposit_protected_date" className="block text-sm font-medium mb-1">
                        Deposit Protected Date
                    </label>
                    <input
                        id="deposit_protected_date"
                        type="date"
                        name="deposit_protected_date"
                        defaultValue={tenant?.deposit_protected_date ?? ""}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* Compliance Checkboxes */}
            <div className="space-y-3 pt-4 border-t">
                <p className="font-medium">Compliance</p>

                <CompliancePair
                    checkboxName="prescribed_info_served"
                    dateName="prescribed_info_date"
                    label="Prescribed Info Served"
                    defaultChecked={tenant?.prescribed_info_served}
                    defaultDate={tenant?.prescribed_info_date}
                />
                <CompliancePair
                    checkboxName="how_to_rent_served"
                    dateName="how_to_rent_date"
                    label="How to Rent Guide Served"
                    defaultChecked={tenant?.how_to_rent_served}
                    defaultDate={tenant?.how_to_rent_date}
                />
                <CompliancePair
                    checkboxName="right_to_rent_checked"
                    dateName="right_to_rent_date"
                    label="Right to Rent Checked"
                    defaultChecked={tenant?.right_to_rent_checked}
                    defaultDate={tenant?.right_to_rent_date}
                />

                <div className="flex items-center gap-3 pt-2">
                    <input
                        type="checkbox"
                        name="is_active"
                        id="is_active"
                        defaultChecked={tenant?.is_active ?? true}
                        value="true"
                        className="w-4 h-4"
                    />
                    <label htmlFor="is_active" className="font-medium">
                        Mark as Active Tenant
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Saving..." : isEditing ? "Update Tenant" : "Add Tenant"}
                </button>
            </div>
        </form>
    );
}

function CompliancePair({
    checkboxName,
    dateName,
    label,
    defaultChecked,
    defaultDate,
}: {
    checkboxName: string;
    dateName: string;
    label: string;
    defaultChecked?: boolean;
    defaultDate?: string | null;
}) {
    return (
        <div className="flex items-center gap-3">
            <input
                type="checkbox"
                name={checkboxName}
                id={checkboxName}
                defaultChecked={defaultChecked}
                value="true"
                className="w-4 h-4"
            />
            <label htmlFor={checkboxName} className="flex-1">
                {label}
            </label>
            <input
                type="date"
                name={dateName}
                defaultValue={defaultDate ?? ""}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
            />
        </div>
    );
}
