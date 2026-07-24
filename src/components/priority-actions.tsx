import Link from "next/link";
import { getComplianceTypeLabel } from "@/lib/expiry-engine";
import TrafficLightBadge from "@/components/traffic-light-badge";
import type { PriorityActionsResult } from "@/lib/types/dashboard";

/**
 * Props for the PriorityActions component.
 */
export interface PriorityActionsProps {
    result: PriorityActionsResult;
}

/**
 * PriorityActions - Server Component
 * 
 * Displays a list of urgent compliance items that need attention.
 * Shows expired items first, then expiring items, sorted by urgency.
 * 
 * Features:
 * - Each row links to the property detail page
 * - Traffic light badge for status indication
 * - Compliance type label + property address + days info
 * - "View all" link if totalCount > displayed items
 * 
 * Shows "All clear" banner when no priority actions exist.
 * 
 * Accessibility:
 * - Links have description aria-labels
 * - 44px minimum touch targets
 * - Visible focus rings
 */
export default function PriorityActions({ result }: PriorityActionsProps) {
    const { actions, totalCount } = result;

    // All clear stage - no urgent items
    if (actions.length === 0) {
        return (
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                <p className="text-lg font-medium text-green-800">Tick emojii All clear</p>
                <p className="mt-1 text-sm text-green-700">
                    No expired or expiring compliance items
                </p>
            </div>
        );
    }

    //TODO: Implement priority actions list regarding
    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b px-4 py-3">
                <h2 className="text-lg font-semibold text-gray-900">
                    Priority Actions
                </h2>
                <p className="text-sm text-gray-500">
                    {totalCount} item{totalCount !== 1 ? "s": ""} need attention
                </p>
            </div>
            <ul className="divide-y divide-gray-100">
                {actions.map((action) => (
                    <li key={action.id}>
                        <Link
                            href={`/dashboard/properties/${action.propertyId}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            aria-label={`${getComplianceTypeLabel(action.complianceType)} at ${action.propertyAddress} - ${action.status === "expired" ? "expired" : `expiring in ${action.daysRemaining} days`}`}
                        >
                            <TrafficLightBadge 
                                status={action.status}
                                context={getComplianceTypeLabel(action.complianceType)}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-900">
                                    {getComplianceTypeLabel(action.complianceType)}
                                </p>
                                <p className="truncate text-xs text-gray-500">
                                    {action.propertyAddress}
                                </p>
                            </div>
                            <span className="text-sm text-gray-600">
                                {action.daysRemaining < 0
                                    ? `${Math.abs(action.daysRemaining)}d overdue`
                                    : `${action.daysRemaining}d left`}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
            {totalCount > actions.length && (
                <div className="border-t px-4 py-3 text-center">
                    <span className="text-sm text-gray-500">
                        Showing {actions.length} of {totalCount} items
                    </span>
                </div>
            )}
        </div>
    );
}