"use client";

import { useActionState } from "react";
import { signup } from "@/app/auth/actions";

export function SignupForm() {
    const [state, formAction, pending] = useActionState(
        async (_prev: { error?: string } | null, formData: FormData) => {
            return await signup(formData);
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
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name
                </label>
                <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
            </div>
            <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
                {pending ? "Creating account..." : "Create account"}
            </button>
            </form>
    );
}