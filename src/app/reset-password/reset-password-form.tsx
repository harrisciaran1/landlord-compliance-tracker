"use client"

import { useActionState } from "react";
import { resetPassword } from "@/app/auth/actions";

export function ResetPasswordForm() {
    const [state, formAction, pending] = useActionState(
        async (_prev: { error?: string } | null, formData: FormData) => {
            return await resetPassword(formData);
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
            {state?.success && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700" role="alert">
                    {state.success}
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
                {pending ? "Sending..." : "Send reset link"}
            </button>
        </form>
    );
}