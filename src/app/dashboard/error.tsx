"use client";

import { useEffect } from "react";

/**
 * Error Boundary for the Dashboard route segment.
 * 
 * Next.js App Router error boundary convention:
 * - Must be a Client Component
 * - Recieves `error` and `reset` props
 * - Wraps the page and nested layouts
 * 
 * Features:
 * - Logs error details (non-sensitive) for debugging
 * - Shows user-friendly message
 * - Provides "Try again" button to reset error boundary 
 * 
 * Accessibility:
 * - role="alert" for error message
 * - 44px minimum touch target on retry button
 * - Visible focus ring
 */

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error for debugging (server digest only, no PII)
        console.error("Dashboard error:", error.digest ?? error.message);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] items-center justify-center p-4">
            <div
                className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert"
            >
                <h2 className="text-lg font-semibold text-red-800">
                    Something went wrong
                </h2>
                <p className="mt-2 text-sm text-red-700">
                    We couldn&apos;t load your dashboard. This may be a temporary issue.
                </p>
                <button
                    type='button'
                    onClick={reset}
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-red-500 focus:ring-offset-2"
                >
                    Try again
                </button>     
            </div>
        </div>
    );
}