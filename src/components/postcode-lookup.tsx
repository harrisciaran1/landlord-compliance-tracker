"use client";

import { useState } from "react";

interface PostcodeResult {
    postcode: string;
    admin_district: string;
    parish: string;
    region: string;
}

interface PostcodeLookupProps {
    onResult: (result: PostcodeResult) => void;
}

export function PostcodeLookup({ onResult }: PostcodeLookupProps) {
    const [postcode, setPostcode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLookup() {
        if (!postcode.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/postcode-lookup?postcode=${encodeURIComponent(postcode)}`
            );
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Lookup failed");
                return; 
            }

            onResult(data);
        } catch {
            setError("Failed to look up postcode");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2 ">
            <label htmlFor="postcode_input" className="block text-sm font-medium text-gray-700">
                Postcode
            </label>
            <div className="flex gap-2">
                <input
                    id="postcode_input"
                    type="text"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleLookup())}
                    placeholder="e.g M1 4QF"
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                    type="button"
                    onClick={handleLookup}
                    disabled={loading || !postcode.trim()}
                    className="rounded-md bg-blue-600 px-4 py-2 tet-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Looking up..." : "Find address"}
                </button>
            </div>
            {error && (
                <p className="text-sm text-red-600" role="alert">{error}</p>
            )}
        </div>
    );
}