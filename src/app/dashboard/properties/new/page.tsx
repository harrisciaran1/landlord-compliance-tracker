import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PropertyForm } from "@/components/property-form";

export default async function NewPropertyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="mx-auto max-w-lg">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm text-blue-600 hover:underline mb-6"
                >
                    #- Back to dashboard
                </Link>
                <h1 className="text-2xl font-bold">Add property</h1>
                <p className="mt-2 text-gray-600">
                    Enter your postcode first, then fill in the property details.
                </p>
                <div className="mt-6">
                    <PropertyForm />
                </div>
            </div>
        </main>
    );
}