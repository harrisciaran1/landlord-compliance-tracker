import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { PropertyCard } from "@/components/property-card";
import PortfolioStats from "@/components/portfolio-stats";
import PriorityActions from "@/components/priority-actions";
import { computePortfolioStats, computePriorityActions } from "@/lib/dashboard";

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

    // Compute dashboard data from properties
    const stats = computePortfolioStats(propertyList);
    const priorityResult = computePriorityActions(propertyList);
    const allClear = stats.expired === 0 && stats.expiring === 0; 

    return (
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            CompliTrack
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/properties/new"
                            className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 pr-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            + Add property
                        </Link>
                        <LogoutButton />
                    </div>
                </div>

                {/* Empty State */}
                {propertyList.length === 0 ? (
                    <div className="mt-16 text-center">
                        <p className="text-5xl">House emojii</p>
                        <h2 className="mt-4 text-xl font-semibold text-gray-900">
                            No properties yet
                        </h2>
                        <p className="mt-2 text-sm text-gray-400">
                            Add your first property to start tracking your compliance.
                        </p>
                        <Link
                            href="/dashboard/properties/new"
                            className="mt-6 inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                                + Add your first property
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Portfolio Stats */}
                        <section className="mt-6" aria-label="Portfolio health">
                            <PortfolioStats stats={stats} />
                        </section>

                        {/* Priority Actions + Property Grid */}
                        <div className="mt-6 lg:grid lg:grid-cols-5 lg:gap-6">
                            {/* Priority Actions (or All Clear) */}
                            <section className="lg:col-span-2"
                            aria-label="Priority actions">
                                {allClear ? (
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                                        <p className="text-lg font-medium text-green-800">Tick emojii All compliant</p>
                                        <p className="mt-1 text-sm text-green-700">
                                            No complaince items are due within the next 30 days.
                                        </p>
                                        {stats.nextDeadline && (
                                            <p className="mt-3 text-sm text-green-700">
                                                Next deadline: {stats.nextDeadline.complianceType === stats.nextDeadline.complianceType ? stats.nextDeadline.propertyAddress : ""} - {stats.nextDeadline.daysRemaining} days
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <PriorityActions result={priorityResult} />
                                )}
                            </section>

                            {/* Property Grid */}
                            <section className="mt-6 lg:col-span-3 lg:mt-0" aria-label="Properties">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Properties ({propertyList.length})
                                    </h2>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
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
                            </section>
                        </div>
                    </>
                )}

                {/* Legal disclaimer */}
                {propertyList.length > 0 && (
                    <footer className="mt-12 border-t pt-4">
                        <p className="text-xs text-gray-400">
                            This tool tracks deadlines and stores documents. It does not provied legal advice or certify compliance. Always verify current requirements with a qualified professional.
                        </p>
                    </footer>
                )}
            </div>
        </main>
    );
}