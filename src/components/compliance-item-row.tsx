"use client"

import { useState, useActionState } from "react";
import { updateComplianceItem } from "@/app/dashboard/properties/actions";
import { ComplianceType, getComplianceTypeLabel } from "@/lib/expiry-engine";
import { StatusBadge } from "./status-badge";
import { calculateStatus } from "@/lib/status";
import DocumentList from "./document-list";
import DocumentUpload from "./document-upload";
import type { DocumentRow } from "@/lib/types/documents";

interface ComplianceItemRowProps {
    id: string;
    type: ComplianceType;
    issue_date: string | null;
    expiry_date: string | null;
    certificate_number: string | null;
    contractor_name: string | null;
    contractor_phone: string | null;
    notes: string | null;
    status: string;
    previous_expiry_date: string | null;
    documents: DocumentRow[];
}

export function ComplianceItemRow(props: ComplianceItemRowProps) {
    const [editing, setEditing] = useState(false);
    const statusInfo = props.status === "not_applicable"
        ? { status: "not_applicable" as const, daysRemaining: null }
        : calculateStatus(props.expiry_date);

    const [state, formAction, pending] = useActionState(
        async (_prev: { error?: string; succes?: boolean } | null, formData: FormData) => {
            const result = await updateComplianceItem(formData);
            if (result?.success) setEditing(false);
            return result;
        },
        null
    );

    // Filter out pending documents (H2: orphan cleanup - only show confirmed uploads)
    const confirmedDocuments = props.documents.filter((d) => d.uploaded_at !== null);

    return (
        <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-medium text-gray-900">
                        {getComplianceTypeLabel(props.type)}
                    </h3>
                    {props.expiry_date && (
                        <p className="text-sm text-gray-500">
                            Expires: {new Date(props.expiry_date).toLocaleDateString("en-GB")}
                        </p>
                    )}
                    {props.contractor_name && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            {props.contractor_name}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={statusInfo.status} daysRemaining={statusInfo.daysRemaining} />
                    <button
                        onClick={() => setEditing(!editing)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        type="button"
                    >
                        {editing ? "Cancel" : "Edit"}
                    </button>
                </div>
            </div>

            {editing && (
                <form action={formAction} className="mt-4 space-y-3 border-t pt-4">
                    <input type="hidden" name="item_id" value={props.id} />
                    <input type="hidden" name="type" value={props.type} />
                    <input type="hidden" name="previous_expiry_date" value={props.previous_expiry_date || ""} />

                    {state?.error && (
                        <p className="text-sm text-red-600" role="alert">{state.error}</p>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label htmlFor={`issue_date_${props.id}`} className="block text-xs font-medium text-gray-700">
                                Issue / test date
                            </label>
                            <input
                                id={`issue_date_${props.id}`}
                                name="issue_date"
                                type="date"
                                defaultValue={props.issue_date || ""}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        {props.type === "fire_risk_assessment" && (
                            <div>
                                <label htmlFor={`manual_expiry_${props.id}`} className="block text-xs font-medium text-gray-700">
                                    Expiry date (assessor-defined)
                                </label>
                                <input
                                    id={`manual_expiry_${props.id}`}
                                    name="manual_expiry_date"
                                    type="date"
                                    required
                                    defaultValue={props.expiry_date || ""}
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor={`cert_${props.id}`} className="block text-xs font-medium text-gray-700">
                                Certificate number
                            </label>
                            <input
                                id={`cert_${props.id}`}
                                name="certificate_number"
                                type="text"
                                defaultValue={props.certificate_number || ""}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor={`contractor_${props.id}`} className="block text-xs font-medium text-gray-700">
                                Contractor name
                            </label>
                            <input
                                id={`contractor_${props.id}`}
                                name="contractor_name"
                                type="text"
                                defaultValue={props.contractor_name || ""}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor={`phone_${props.id}`} className="block text-xs font-medium text-gray-700">
                                Contractor phone
                            </label>
                            <input
                                id={`phone_${props.id}`}
                                name="contractor_phone"
                                type="text"
                                defaultValue={props.contractor_phone || ""}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor={`notes_${props.id}`} className="block text-xs font-medium text-gray-700">
                            Notes
                        </label>
                        <input
                            id={`notes_${props.id}`}
                            name="notes"
                            type="text"
                            defaultValue={props.notes || ""}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={pending}
                        className="min-h-[44px] rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        {pending ? "Saving..." : "Save"}    
                    </button>
                </form>
            )}

            {/* Document section - always visible below edit form */}
            <div className="mt-4 border-t pt-3">
                <DocumentList documents={confirmedDocuments} complianceItemId={props.id} />
                <DocumentUpload complianceItemId={props.id} />
            </div>
        </div>
    );
}