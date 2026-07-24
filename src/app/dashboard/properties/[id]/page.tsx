import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPropertyTypeLabel } from "@/lib/compliance_templates";
import { ComplianceItemRow } from "@/components/compliance-item-row";
import type { ComplianceType } from "@/lib/expiry-engine";
import type { DocumentRow } from "@/lib/types/documents";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PropertDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: property } = await supabase
        .from("properties")
        .select("*, compliance_items(*, documents(*))")
        .eq("id", id)
        .eq("is_archived", false)
        .single();

    if (!property) notFound();

    return (
        <main className="min-h-screen p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
                <Link
                    href="/dashboard"
                    className="inlin-flex items-center text-sm text-blue-600 hover:underline mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                    -- Back to dashboard
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold">{property.address_line1}</h1>
                    <p className="text-gray-500">
                        {property.city}, {property.postcode}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                        {getPropertyTypeLabel(property.property_type)}
                        {property.num_bedrooms && ` . ${property.num_bedrooms} bed`}
                        {property.council_area && ` . ${property.council_area}`}
                    </p>
                </div>

                <h2 className="text-lg font-semibold mb-4">Compliance items</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Enter issue dates and the expiry will be calculated automatically.
                </p>

                <div className="space-y-3">
                    {property.compliance_items
                        .sort((a: { type: string }, b: { type: string }) => a.type.localeCompare(b.type))
                        .map((item: {
                            id: string;
                            type: string;
                            issue_date: string | null;
                            expiry_date: string | null;
                            certificate_number: string | null;
                            contractor_name: string | null;
                            contractor_phone: string | null;
                            notes: string | null;
                            status: string;
                            previous_expiry_date: string | null;
                            documents: DocumentRow[];
                        }) => (
                        <ComplianceItemRow
                            key={item.id}
                            id={item.id}
                            type={item.type as ComplianceType}
                            issue_date={item.issue_date}
                            expiry_date={item.expiry_date}
                            certificate_number={item.certificate_number}
                            contractor_name={item.contractor_name}
                            contractor_phone={item.contractor_phone}
                            notes={item.notes}
                            status={item.status}
                            previous_expiry_date={item.previous_expiry_date}
                            documents={item.documents || []}
                        />
                    ))}
                </div>
            </div>
        </main>
    )
}
