"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/auth/actions";

export function UpdatePasswordForm() {
    const [state, formAction, pending] = useActionState(
        async (_prev: { error?: string } | null, formData: FormData) => {
            return await updatePassword(formData);
        },
        null
    );

    return (
        <form action={formAction} className="space-y-4">
            {state?.error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {state.error}
                </div>
            )}
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New Password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
                {pending ? "Updating..." : "Update Password"}
            </button>
        </form>
    );
}