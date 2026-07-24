import Link from "next/link";
import TrafficLigtBadge from  "./traffic-light-badge"
import { getPropertyTypeLabel, type PropertyType } from "@/lib/compliance_templates";
import { getComplianceTypeLabel, type ComplianceType } from "@/lib/expiry-engine";
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

    // Find the soonest expiring item (future dates only)
    const futureItems = compliance_items
        .filter((item) => item.expiry_date && item.status !== "not_applicable")
        .map((item) => ({
            ...item,
            statusInfo: calculateStatus(item.expiry_date),
        }))
        .filter((item) => item.statusInfo.daysRemaining !== null && item.statusInfo.daysRemaining >= 0)
        .sort((a, b) => a.statusInfo.daysRemaining! - b.statusInfo.daysRemaining!);

    const soonest = futureItems[0];
    const contextText = soonest ? `${getComplianceTypeLabel(soonest.type as ComplianceType)} due in ${soonest.statusInfo.daysRemaining} days`
        : undefined;

    return (
        <Link
            href={`/dashboard/properties/${id}`}
            className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                <TrafficLigtBadge status={worstStatus} context={contextText} />
            </div>
            {soonest && (
                <p className="mt-3 text-sm text-gray-600">
                    Next: {getComplianceTypeLabel(soonest.type as ComplianceType)} in {soonest.statusInfo.daysRemaining} days
                </p>
            )}
            {!soonest && worstStatus === "expired" && (
                <p className="mt-3 text-sm text-red-600">
                    Has expired items - action needed
                </p>
            )}
        </Link>
    );
}