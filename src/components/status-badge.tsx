import { type ComplianceStatus } from "@/lib/status";

interface StatusBadgeProps {
    status: ComplianceStatus;
    daysRemaining?: number | null;
}

const config: Record<ComplianceStatus, { icon: string; label: string; classes: string }> = {
    valid: {
        icon: "v",
        label: "Valid",
        classes: "bg-green-100 text-green-800 border-green-300",
    },
    expiring: {
        icon: "x",
        label: "Expiring",
        classes: "bg-amber-100 text-amber-800 border-amber-300",
    },
    expired: {
        icon: "X",
        label: "Expired",
        classes: "bg-red-100 text-red-800 border-red-300"
    },
    unknown: {
        icon: "?",
        label: "Not set",
        classes: "bg-gray-100 text-gray-600 border-gray-300"
    },
    not_applicable: {
        icon: "-",
        label: "N/A",
        classes: "bg-gray-50 text-gray-500 border-gray-200"
    },
};

export function StatusBadge({ status, daysRemaining }: StatusBadgeProps) {
    const { icon, label, classes } = config[status];

    const daysText = 
        daysRemaining !== null && daysRemaining !== undefined
            ? status === "expired"
                ? `${Math.abs(daysRemaining)}d overdue`
                : `${daysRemaining} d left`
            : null;
    
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium ${classes}`}
            role="status"
            aria-label={`${label}${daysText ? `, ${daysText}` : ""}`}
        >
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
            {daysText && <span className="text-xs opacity-75">({daysText})</span>}
        </span>
    );
}