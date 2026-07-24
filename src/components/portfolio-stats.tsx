import type { PortfolioStats } from "@/lib/types/dashboard";
import { getComplianceTypeLabel } from "@/lib/expiry-engine";
import { stat } from "fs";

export interface PortfolioStatsProps {
    stats: PortfolioStats;
}

/**
 * PortfolioStats - Server Component
 * 
 * Displays aggregated compliance statistics as a responsive grid of cards.
 * Triple redundancy: icon + text label + colour background on each stat card.
 */
export default function PortfolioStats({ stats }: PortfolioStatsProps) {
    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Portfolio Health</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Properties count */}
                <div
                    className="rounded-lg border border-gray-200 bg-white p-4"
                    aria-label={`${stats.totalProperties} ${stats.totalProperties === 1 ? "property" : "properties"}`}
                >
                    <p className="text-2xl font-bold text-gray-800">{stats.totalProperties}</p>
                    <p className="text-sm text-gray-600">Properties</p>
                </div>

                {/* Expired count */}
                <div
                    className="rounded-lg border border-red-200 bg-red-60 p-4"
                    aria-label={`${stats.expired} compliance ${stats.expired === 1 ? "item" : "items"} expired`}
                >
                    <p className="text-2xl font-bold text-red-800">{stats.expired}</p>
                    <p className="text-sm text-red-700">
                        <span aria-hidden="true">X </span>Expired
                    </p>
                </div>

                {/* Expiring count */}
                <div
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                    aria-label={`${stats.expiring} compliance ${stats.expiring === 1 ? "item" : "items"} expiring soon`}
                >
                    <p className="text-2xl font-bold text-red-800">{stats.expiring}</p>
                    <p className="text-sm text-red-700">
                        <span aria-hidden="true">Danger sign emojii </span>Expiring
                    </p>
                </div>

                {/* Valid count */}
                <div
                    className="rounded-lg border border-amber-200 bg-amber-50 p-4"
                    aria-label={`${stats.valid} compliance ${stats.valid === 1 ? "item" : "items"} valid`}
                >
                    <p className="text-2xl font-bold text-red-800">{stats.valid}</p>
                    <p className="text-sm text-red-700">
                        <span aria-hidden="true">Tick emojii </span>Valid
                    </p>
                </div>
            </div>

            {/* Next deadline callout */}
            {stats.nextDeadline && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span aria-hidden="true" className="text-blue-600">Calendar emojii</span>
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                Next deadline: {getComplianceTypeLabel(stats.nextDeadline.complianceType)}
                            </p>
                            <p className="text-xs text-blue-700">
                                {stats.nextDeadline.propertyAddress} - {stats.nextDeadline.daysRemaining} days ({new Date(stats.nextDeadline.expiryDate).toLocaleDateString("en-GB")})
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}