export type ComplianceStatus = 
    | "valid"
    | "expiring"
    | "expired"
    | "not_applicable"
    | "unknown";

export interface StatusInfo {
    status: ComplianceStatus;
    label: string;
    daysRemaining: number | null;
}

/**
 * Calculate compliance status from expiry date.
 * - valid: expiry > today + 30 days
 * - expiring: expiry <= today + 30 days AND expiry >= today
 * - expired: expiry < today
 */
export function calculateStatus(expiryDate: string | null): StatusInfo {
    if (!expiryDate) {
        return { status: "unknown", label: "Not set", daysRemaining: null};
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffMs = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 *24));

    if (daysRemaining < 0) {
        return { status: "expired", label: "Expired", daysRemaining};
    }
    if (daysRemaining <= 30) {
        return { status: "expiring", label: "Expiring soon", daysRemaining};
    }
    return { status: "valid", label: "Valid", daysRemaining};
}

/**
 * Get the worst status from a list of compliance items.
 * Priority: expired > expiring > unknown > valid > not_applicable
 */
export function getWorstStatus(statuses: ComplianceStatus[]): ComplianceStatus {
    const priority: Record<ComplianceStatus, number> = {
        expired: 0,
        expiring: 1,
        unknown: 2,
        valid: 3,
        not_applicable: 4,
    };

    return statuses.reduce<ComplianceStatus>((worst, current) => {
        return priority[current] <priority[worst] ? current : worst;
    }, "not_applicable");
}