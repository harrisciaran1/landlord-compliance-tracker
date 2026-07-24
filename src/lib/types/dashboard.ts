import { ComplianceStatus } from "@/lib/status";
import { ComplianceType } from "@/lib/expiry-engine";

/**
 * Aggregated stats across the entire property portfolio.
 */
export interface PortfolioStats {
    totalProperties: number;
    totalItems: number;
    expired: number;
    expiring: number;
    valid: number;
    unknown: number;
    nextDeadline: NextDeadline | null;
}

/**
 * The soonest upcoming deadline across the portfolio
 */
export interface NextDeadline {
    propertyAddress: string;
    complianceType: ComplianceType;
    daysRemaining: number;
    expiryDate: string; // ISO date string
}

/**
 * A single urgent action item displayed in the priority actions list.
 */
export interface PriorityAction {
    id: string; // compliance_item id
    propertyId: string;
    propertyAddress: string;
    complianceType: ComplianceType;
    status: ComplianceStatus;
    daysRemaining: number;
    expiryDate: string | null;
}

/**
 * Result of computing priority actions with total count for "show more".
 */
export interface PriorityActionsResult {
    actions: PriorityAction[];
    totalCount: number;
}

/**
 * Traffic light summary for a single property.
 */
export interface PropertyTrafficLight {
    worstStatus: ComplianceStatus;
    nextDeadline: NextDeadline | null;
}