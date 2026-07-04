import Link from "next/link";
import { StatusBadge } from  "./status-badge"
import { getPropertyTypeLabel, type PropertyType } from "@/lib/compliance_templates";
import { calculateStatus, getWorstStatus, type ComplianceStatus } from "@/lib/status";

interface ComplianceItem {
    id: string;
    type: string;
    expiry_date: string | null;
    status: string;
}

interface PropertyCardProps {
    id: string;
    address_line1: string;
    city: string;
    postcode: string;
    property_type: PropertyType;
    compliance_items: ComplianceItem[];
}

export function PropertyCard({
    id,
    address_line1,
    city,
    postcode,
    property_type,
    compliance_items,
}: PropertyCardProps) {
    // Calculate live statuses from expiry dates
    const statuses = compliance_items.map((item) => {
        if (item.status === "not_applicable") return "not_applicable" as ComplianceStatus;
        return calculateStatus(item.expiry_date).status;
    });
    const worstStatus = getWorstStatus(statuses);

    // Find the soonest expiring item
    const soonest = compliance_items
        .filter((item) => item.expiry_date && item.status !== "not_applicable")
        .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())[0];

    const soonestStatus = soonest ? calculateStatus(soonest.expiry_date) : null;

    return (
        <Link
            href={`/dashboard/properties/${id}`}
            className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-colors"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{address_line1}</h3>
                    <p className="text-sm text-gray-500">
                        {city}, {postcode}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                        {getPropertyTypeLabel(property_type)}
                    </p>
                </div>
                <StatusBadge status={worstStatus} />
            </div>
            {soonestStatus && soonestStatus.daysRemaining !== null && (
                <p className="mt-3 text-sm text-gray-600">
                    Next due: {soonestStatus.daysRemaining <= 0
                        ? "Overdue"
                        : `${soonestStatus.daysRemaining} days`}
                </p>
            )}
        </Link>
    );
}