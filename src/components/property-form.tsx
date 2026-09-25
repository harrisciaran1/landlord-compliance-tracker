"use client";

import {useState, useActionState } from "react";
import { createProperty } from "@/app/dashboard/properties/actions";
import { PostcodeLookup } from "./postcode-lookup";

export function PropertyForm() {
    const [postcode, setPostcode] = useState("");
    const [councilArea, setCouncilArea] = useState("");
    const [postcodeVerified, setPostcodeVerified] = useState(false);

    const [state, formAction, pending] = useActionState(
        async (_prev: { error?: string } | null, formData: FormData) => {
            return await createProperty(formData);
        },
        null
    );

    function handlPostcodeResult(result: { postcode: string; admin_district: string }) {
        setPostcode(result.postcode);
        setCouncilArea(result.admin_district);
        setPostcodeVerified(true);
    }

    return (
        <form action={formAction} className="space-y-6">
            {state?.error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {state.error}
                </div>
            )}

            <PostcodeLookup onResult={handlPostcodeResult} />

            {postcodeVerified && (
                <p className="text-sm text-green-700">
                    V Postcode verified - {councilArea}
                </p>
            )}

            <input type="hidden" name="postcode" value={postcode} />
            <input type="hidden" name="council_area" value={councilArea} />

            <div>
                <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
                    Address line 1 *
                </label>
                <input
                    id="address_line1"
                    name="address_line1"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
                    Address line 2
                </label>
                <input
                    id="address_line2"
                    name="address_line2"
                    type="text"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
            </div>

            <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City *
                </label>
                <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />  
            </div>

            <div>
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700">
                    Property type *
                </label>
                <select
                    id="property_type"
                    name="property_type"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                    <option value="single_let">Single Let</option>
                    <option value="flat">Flat</option>
                    <option value="hmo">HMO</option>
                </select>
            </div>

            <div>
                <label htmlFor="num_bedrooms" className="block text-sm font-medium text-gray-700">
                    Number of bedrooms
                </label>
                <input
                    id="num_bedrooms"
                    name="num_bedrooms"
                    type="number"
                    min="1"
                    max="20"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                </label>
                <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
            </div>

            <button
                type="submit"
                disabled={pending || !postcodeVerified}
                className="w-full rounded-md bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 focu:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                {pending ? "Adding property..." : "Add property"}
            </button>
        </form>
    );
}