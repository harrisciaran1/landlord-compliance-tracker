import type { ComplianceStatus } from "@/lib/status";

/**
 * Props for the TrafficLightBadge component.
 */
export interface TrafficLightBadgeProps {
    status: ComplianceStatus;
    //** Optional context for aria-label (e.g., compliance type name). */
    context?: string;
}

/**
 * Status daily configuration.
 */
interface StatusConfig {
    icon: string;
    label: string;
    bgClass: string;
    textClass: string;
}

const STATUS_CONFIG: Record<ComplianceStatus, StatusConfig> = {
    expired: {
        icon: "X",
        label: "Expired",
        bgClass: "bg-red-100",
        textClass: "text-red-800",
    },
    expiring: {
        icon: "!",
        label: "Expiring",
        bgClass: "bg-amber-100",
        textClass: "text-amber-800",
    },
    valid: {
        icon: "✓",
        label: "Valid",
        bgClass: "bg-green-100",
        textClass: "text-green-800",
    },
    unknown: {
        icon: "?",
        label: "Not set",
        bgClass: "bg-gray-100",
        textClass: "text-gray-600",
    },
    not_applicable: {
        icon: "-",
        label: "N/A",
        bgClass: "bg-gray-100",
        textClass: "text-gray-600",
    },
};

/**
 * TrafficLightBadge - Server Component
 * 
 * Accessible status indicator with triple redundancy:
 * 1. Icon
 * 2. Text label
 * 3. Background colour
 * 
 * Contrast ratios meet WCAG AA
 * 
 * Accessibility:
 * - Aria label includes optional context (e.g., "Gas Safety Certificate: Expired")
 * - Icon is aria-hidden (redundant with text)
 */
export default function TrafficLightBadge({
    status,
    context,
}: TrafficLightBadgeProps) {
    const config = STATUS_CONFIG[status];
    const ariaLabel = context
        ? `${context}: ${config.label}`
        : config.label;

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bgClass} ${config.textClass}`}
            aria-label={ariaLabel}
            role="status"
        >
            <span aria-hidden="true">{config.icon}</span>
            {config.label}
        </span>
    );
}