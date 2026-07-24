import { calculateStatus, getWorstStatus, type ComplianceStatus } from "@/lib/status";
import type { ComplianceType } from "@/lib/expiry-engine";
import type {
    PortfolioStats,
    PriorityAction,
    PriorityActionsResult,
    PropertyTrafficLight,
    NextDeadline,
} from "@/lib/types/dashboard";
import { get } from "http";

/**
 * Shape of a property with compliance items as returned from Supabase query.
 */
export interface PropertyWithItems {
    id: string;
    address_line1: string;
    postcode: string;
    compliance_items: ComplianceItem[];
}

export interface ComplianceItem {
    id: string;
    type: ComplianceType;
    expiry_date: string | null;
    status: string;
}

/**
 * Compute aggregate portfolio statistics across all properties.
 * 
 * Iterates all compliance_items, uses calculateStatus for each,
 * counts expired/expiring/valid/unknown, and finds the nearest deadline.
 */
export function computePortfolioStats(
    properties: PropertyWithItems[]
): PortfolioStats{
    let totalItems = 0;
    let expired = 0;
    let expiring = 0;
    let valid = 0;
    let unknown = 0;
    let nextDeadline: NextDeadline | null = null;
    let soonestFutureDays = Infinity;

    for (const property of properties) {
        for (const item of property.compliance_items) {
            totalItems++;

            if (item.status === "not_applicable") continue;

            const statusInfo = calculateStatus(item.expiry_date);

            switch (statusInfo.status) {
                case "expired":
                    expired++;
                    break;
                case "expiring":
                    expiring++;
                    break;
                case "valid":
                    valid++;
                    break;
                case "unknown":
                    unknown++;
                    break;
            }

            // Track soonest feature deadline (not expired, not unknown)
            if (
                statusInfo.daysRemaining !== null &&
                statusInfo.daysRemaining >= 0 &&
                statusInfo.daysRemaining < soonestFutureDays
            ) {
                soonestFutureDays = statusInfo.daysRemaining;
                nextDeadline = {
                    propertyAddress: property.address_line1,
                    complianceType: item.type,
                    daysRemaining: statusInfo.daysRemaining,
                    expiryDate: item.expiry_date!,
                };
            }
        }
    }

    return {
        totalProperties: properties.length,
        totalItems,
        expired,
        expiring,
        valid,
        unknown,
        nextDeadline,
    };
}

/**
 * Compute priority actions: items that are expired or expiring soon
 */
export function computePriorityActions(
    properties: PropertyWithItems[],
    limit: number = 10
): PriorityActionsResult {
    const allActions: PriorityAction[] = [];

    for (const property of properties) {
        for (const item of property.compliance_items) {
            if (item.status === "not_applicable") continue;
            if (!item.expiry_date) continue;

            const statusInfo = calculateStatus(item.expiry_date);

            if (statusInfo.status === "expired" || statusInfo.status === "expiring") {
                allActions.push({
                    id: item.id,
                    propertyId: property.id,
                    propertyAddress: property.address_line1,
                    complianceType: item.type,
                    status: statusInfo.status,
                    daysRemaining: statusInfo.daysRemaining!,
                    expiryDate: item.expiry_date,
                });
            }
        }
    }

    // Sort: expired first (by daysRemaining ascending), then expiring (by daysRemaining ascending)
    allActions.sort((a, b) => {
        if (a.status === "expired" && b.status !== "expired") return -1;
        if (a.status !== "expired" && b.status === "expired") return 1;
        return a.daysRemaining - b.daysRemaining;
    });

    return {
        actions: allActions.slice(0, limit),
        totalCount: allActions.length,
    };
}

/**
 * Compute the traffic light summary for a single property's compliance items.
 * 
 * Uses getWorstStatus for the overall status and finds the soonest future deadline.
 */
export function computePortfolioTrafficLight(
    items: ComplianceItem[],
    propertyAddress: string = ""
): PropertyTrafficLight {
    const statuses: ComplianceStatus[] = items.map((item) => {
        if (item.status === "not_applicable") return "not_applicable";
        return calculateStatus(item.expiry_date).status;
    });

    const worstStatus = getWorstStatus(statuses);

    // Find soonest fixture deadline for this property
    let nextDeadline: NextDeadline | null = null;
    let soonestDays = Infinity;

    for (const item of items) {
        if (item.status === "not_applicable") continue;
        if (!item.expiry_date) continue;

        const statusInfo = calculateStatus(item.expiry_date);
        if (
            statusInfo.daysRemaining !== null &&
            statusInfo.daysRemaining >= 0 &&
            statusInfo.daysRemaining < soonestDays
        ) {
            soonestDays = statusInfo.daysRemaining;
            nextDeadline = {
                propertyAddress,
                complianceType: item.type,
                daysRemaining: statusInfo.daysRemaining,
                expiryDate: item.expiry_date,
            };
        }
    }

    return { worstStatus, nextDeadline };
}