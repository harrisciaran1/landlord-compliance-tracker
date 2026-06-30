export type ComplianceType =
    | "gas_safety"
    | "eicr"
    | "epc"
    | "smoke_alarms"
    | "co_alarms"
    | "deposit_protection"
    | "prescribed_info"
    | "how_to_rent"
    | "right_to_rent"
    | "fire_risk_assessment"
    | "custom";

interface ExpiryInput {
    type: ComplianceType;
    issueDate: string; // ISO date string YYYY-MM-DD
    previousExpiryDate?: string | null;
    validityMonths?: number | null; // for custom items
}

/**
 * Calculate expiry date for a compliance item.
 * 
 * Gas safety anniversary rule:
 * If renewed within 2 months before previous expiry, new expiry = old expiry + 12 months.
 * Otherwise: new expiry = issue date + 12 months.
 */
export function calculateExpiryDate(input: ExpiryInput): string | null {
    const { type, issueDate, previousExpiryDate, validityMonths } = input;

    const months = getValidityMonths(type, validityMonths);
    if (months === null) return null;

    if (type === "gas_safety" && previousExpiryDate) {
        return applyGasSafetyAnniversaryRule(issueDate, previousExpiryDate);
    }

    return addMonths(issueDate, months);
}

function getValidityMonths( type: ComplianceType, customMonths?: number | null): number | null {
    const validityMap: Record<ComplianceType, number | null>= {
        gas_safety: 12,
        eicr: 60,
        epc: 120,
        smoke_alarms: 12,
        co_alarms: 12,
        deposit_protection: null, // one-time, handled separately
        prescribed_info: null,
        how_to_rent: null,
        right_to_rent: null,
        fire_risk_assessment: null, // assessor-defined
        custom: customMonths ?? null,
    };

    return validityMap[type];
}

function applyGasSafetyAnniversaryRule(issueDate: string, previousExpiryDate: string): string {
    const issue = new Date(issueDate);
    const prevExpiry = new Date(previousExpiryDate);
    const twoMonthsBefore = new Date(prevExpiry);
    twoMonthsBefore.setMonth(twoMonthsBefore.getMonth() - 2);

    // If issued within 2 months before previous expiry, use anniversary date
    if (issue >= twoMonthsBefore && issue <= prevExpiry) {
        return addMonths(previousExpiryDate, 12);
    }

    return addMonths(issueDate, 12);
}

function addMonths(dateStr: string, months: number): string {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
}

/** Human-readable label for compliance types */
export function getComplianceTypeLabel(type: ComplianceType): string {
    const labels: Record<ComplianceType, string> = {
        gas_safety: "Gas Safety Certificate",
        eicr: "EICR",
        epc: "EPC",
        smoke_alarms: "Smoke Alarms",
        co_alarms: "CO Alarms",
        deposit_protection: "Deposit Protection",
        prescribed_info: "Prescribed Information",
        how_to_rent: "How to Rent Guide",
        right_to_rent: "Right to Rent",
        fire_risk_assessment: "Fire Risk Assessment",
        custom: "Custom",
    };
    return labels[type];
}