import { ComplianceType } from "./expiry-engine";

export type PropertyType = "single_let" | "hmo" | "flat";

const baseItems: ComplianceType[] = [
    "gas_safety",
    "eicr",
    "epc",
    "smoke_alarms",
    "co_alarms",
];

const templates: Record<PropertyType, ComplianceType[]> = {
    single_let: baseItems,
    flat: baseItems,
    hmo: [...baseItems, "fire_risk_assessment"],
};

export function getDefaultComplianceItems(
    propertyType: PropertyType
): ComplianceType[] {
    return templates[propertyType];
}

export function getPropertyTypeLabel(type: PropertyType): string {
    const labels: Record<PropertyType, string> = {
        single_let: "Single Let",
        hmo: "HMO",
        flat: "Flat",
    };
    return labels[type];
}