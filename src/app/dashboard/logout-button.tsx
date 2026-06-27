"use client";

import { logout } from "@/app/auth/actions";

export function LogoutButton() {
    return (
        <form action={logout}>
            <button
                type="submit"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                Logout
            </button>
        </form>
    );
}