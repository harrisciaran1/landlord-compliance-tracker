import type { Tenant } from "@/lib/types/tenants";
import { DEPOSIT_SCHEME_LABELS } from "@/lib/types/tenants";

interface TenantCardProps {
    tenant: Tenant;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function TenantCard({ tenant, onEdit, onDelete }: TenantCardProps) {
    const depositAmount = tenant.deposit_amount_pence
        ? `£${(tenant.deposit_amount_pence / 100).toFixed(2)}`
        : null;

    const depositSchemeLabel = tenant.deposit_scheme
        ? DEPOSIT_SCHEME_LABELS[tenant.deposit_scheme]
        : null;

    return (
        <div
            className={`border rounded-lg p-4 ${
                tenant.is_active ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"
            }`}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-lg">{tenant.name}</h3>
                    <p className="text-sm text-gray-600">
                        {tenant.is_active ? "Active Tenant" : "Past Tenant"}
                    </p>
                </div>
                <div className="flex gap-2">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-1 text-sm">
                {tenant.email && (
                    <p>
                        <span className="font-medium">Email:</span> {tenant.email}
                    </p>
                )}
                {tenant.phone && (
                    <p>
                        <span className="font-medium">Phone:</span> {tenant.phone}
                    </p>
                )}

                <p>
                    <span className="font-medium">Tenancy:</span> {tenant.tenancy_start}
                    {tenant.tenancy_end && ` → ${tenant.tenancy_end}`}
                </p>

                {depositAmount && (
                    <p>
                        <span className="font-medium">Deposit:</span> {depositAmount}
                        {depositSchemeLabel && ` (${depositSchemeLabel})`}
                    </p>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-sm">
                <p className="font-medium mb-1">Compliance:</p>
                <ComplianceCheck
                    done={!!tenant.deposit_protected_date}
                    label="Deposit Protected"
                    date={tenant.deposit_protected_date}
                />
                <ComplianceCheck
                    done={tenant.prescribed_info_served}
                    label="Prescribed Info Served"
                    date={tenant.prescribed_info_date}
                />
                <ComplianceCheck
                    done={tenant.how_to_rent_served}
                    label="How to Rent Guide Served"
                    date={tenant.how_to_rent_date}
                />
                <ComplianceCheck
                    done={tenant.right_to_rent_checked}
                    label="Right to Rent Checked"
                    date={tenant.right_to_rent_date}
                />
            </div>
        </div>
    );
}

function ComplianceCheck({
    done,
    label,
    date,
}: {
    done: boolean;
    label: string;
    date: string | null;
}) {
    return (
        <div className="flex items-center gap-2">
            <span aria-hidden="true">{done ? "✅" : "❌"}</span>
            <span>{label}</span>
            {date && <span className="text-gray-500">({date})</span>}
        </div>
    );
}
