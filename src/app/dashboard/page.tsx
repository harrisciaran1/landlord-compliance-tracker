import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { PropertyCard } from "@/components/property-card";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError, } = await supabase
        .from("users")
        .select("org_id, full_name")
        .eq("id", user.id)
        .single();

    console.log("Authenticated user:", user.id);
    console.log("Profile:", profile);
    console.log("Profile error:", profileError);

    if (!profile) redirect("/login");

    const { data: properties } = await supabase
        .from("properties")
        .select("id, address_line1, address_line2, city, postcode, property_type, compliance_items(id, type, expiry_date, status)")
        .eq("org_id", profile.org_id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

    const propertyList = properties || [];

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Your properties</h1>
                        <p className="text-sm text-gray-500">
                            {propertyList.length === 0
                                ? "Add your first property to get started"
                                : `${propertyList.length} ${propertyList.length === 1 ? "property" : "properties"}`}
                        </p>
                    </div>
                    <LogoutButton />
                </div>

                <div className="mt-6">
                    <Link
                        href="/dashboard/properties/new"
                        className="inline-flex items-center rounded-md bg-blue-600 pr-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        + Add property
                    </Link>
                </div>

                {propertyList.length === 0 ? (
                    <div className="mt-12 text-center">
                        <p className="text-lg text-gray-500">No properties yet</p>
                        <p className="mt-2 text-sm text-gray-400">
                            Add a property to start tracking your compliance deadllines.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4">
                        {propertyList.map((property) => (
                            <PropertyCard
                                key={property.id}
                                id={property.id}
                                address_line1={property.address_line1}
                                city={property.city}
                                postcode={property.postcode}
                                property_type={property.property_type}
                                compliance_items={property.compliance_items}
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}