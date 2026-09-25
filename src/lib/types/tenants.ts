export type DepositScheme = "dps" | "tds_custodial" | "tds_insured" | "mydeposits";

export interface Tenant {
    id: string;
    property_id: string | null;
    org_id: string;

    // Decrypted fields (client-side representation)
    name: string;
    email: string | null;
    phone: string | null;

    tenancy_start: string; // ISO date (YYYY-MM-DD)
    tenancy_end: string | null;
    deposit_amount_pence: number | null;
    deposit_scheme: DepositScheme | null;
    deposit_protected_date: string | null;

    prescribed_info_served: boolean;
    prescribed_info_date: string | null;
    how_to_rent_served: boolean;
    how_to_rent_date: string | null;
    right_to_rent_checked: boolean;
    right_to_rent_date: string | null;

    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Database row type (encrypted PII fields)
export interface TenantRow {
    id: string;
    property_id: string | null;
    org_id: string;

    name_encrypted: string;
    email_encrypted: string | null;
    phone_encrypted: string | null;

    tenancy_start: string;
    tenancy_end: string | null;
    deposit_amount_pence: number | null;
    deposit_scheme: DepositScheme | null;
    deposit_protected_date: string | null;

    prescribed_info_served: boolean;
    prescribed_info_date: string | null;
    how_to_rent_served: boolean;
    how_to_rent_date: string | null;
    right_to_rent_checked: boolean;
    right_to_rent_date: string | null;

    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const DEPOSIT_SCHEME_LABELS: Record<DepositScheme, string> = {
    dps: "Deposit Protection Service (DPS)",
    tds_custodial: "Tenancy Deposit Scheme (TDS Custodial)",
    tds_insured: "Tenancy Deposit Scheme (TDS Insured)",
    mydeposits: "MyDeposits",
};
