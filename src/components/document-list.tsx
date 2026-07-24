"use client";

import { useState, useCallback } from "react";
import { getDocumentDownloadUrl, deleteDocument } from "@/app/dashboard/properties/actions";
import { formatFileSize, isImageMimeType } from "@/lib/documents";
import DocumentPreview from "@/components/document-preview";
import type { DocumentRow } from "@/lib/types/documents";

export interface DocumentListProps {
    documents: DocumentRow[];
    complianceItemId: string;
}

/**
 * DocumentList - Client Component
 * 
 * Displays a sorted list of uploaded documents with download, preview, and delete actions.
 */
export default function DocumentList({ documents }: DocumentListProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDownload = useCallback(async (documentId: string, mimeType: string) => {
        setLoadingId(documentId);
        setError(null);

        const result = await getDocumentDownloadUrl(documentId);
        setLoadingId(null);

        if (!result || "error" in result) {
            setError(result?.error || "Failed to get download URL");
            return;
        }

        if (mimeType === "application/pdf") {
            window.open(result.url, "_blank");
        } else {
            // Download image files
            const a = document.createElement("a");
            a.href = result.url;
            a.download = result.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }, []);

    const handlePreview = useCallback(async (documentId: string, fileName: string) => {
        setLoadingId(documentId);
        setError(null);

        const result = await getDocumentDownloadUrl(documentId);
        setLoadingId(null);

        if (!result || "error" in result) {
            setError(result?.error || "Failed to get preview URL");
            return;
        }

        setPreviewUrl(result.url);
        setPreviewFileName(fileName);
    }, []);

    const handleDelete = useCallback(async (documentId: string) => {
        setLoadingId(documentId);
        setError(null);

        const result = await deleteDocument(documentId);
        setLoadingId(null);
        setDeletingId(null);

        if (result && "error" in result && result.error) {
            setError(result.error);
        }
    }, []);

    const sortedDocuments = [...documents].sort((a, b) => b.version - a.version);

    if (sortedDocuments.length === 0) {
        return (
            <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">
                    No documents uploaded yet.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-2">
            <h4  className="text-sm font-medium text-gray-700">
                Documents ({sortedDocuments.length})
            </h4>

            {error && (
                <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
            )}

            <ul className="mt-1 divide-y divide-gray-100">
                {sortedDocuments.map((doc) => (
                    <li
                        key={doc.id}
                        className="py-2"
                    >
                        <div className="flex items-start gap-2 sm:items-center">
                            {/* File icon */}
                            <span aria-hidden="true" className="shrink-0 text-base">
                                {isImageMimeType(doc.mime_type) ? "emojii" : "emojii"}
                            </span>

                            {/* File info */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="truncate text-sm text-gray-900" title={doc.file_name}>
                                        {doc.file_name}
                                    </span>
                                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                        v{doc.version}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {formatFileSize(doc.file_size)}
                                    {doc.uploaded_at && (
                                        <> . {new Date(doc.uploaded_at).toLocaleDateString("en-GB")}</>
                                    )}
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex shrink-0 items-center gap-1">
                                {deletingId === doc.id ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-600">Deleter?</span>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingId(null)}
                                            className="min-h-[44px] rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(doc.id)}
                                            disabled={loadingId === doc.id}
                                            className="min-h-[44px] rounded px-2 py-1 text-xs font-mdeium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                                        >
                                            {loadingId === doc.id ? "..." : "Delete"}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Download */}
                                        <button
                                            type="button"
                                            onClick={() => handleDownload(doc.id, doc.mime_type)}
                                            disabled={loadingId === doc.id}
                                            className="min-h-[44px] rounded p-2 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50" aria-label={`Download ${doc.file_name}`}
                                        >
                                            DOWN ARROW emojii
                                        </button>

                                        {/* Preview (images only) */}
                                        {isImageMimeType(doc.mime_type) && (
                                            <button
                                                type="button"
                                                onClick={() => handlePreview(doc.id, doc.file_name)}
                                                disabled={loadingId === doc.id}
                                                className="min-h-[44px] rounded p-2 text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50" aria-label={`Preview ${doc.file_name}`}
                                            >
                                                EYE emojii
                                            </button>
                                        )}

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => setDeletingId(doc.id)}
                                            className="min-h-[44px] min-w-[44px] rounded p-2 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" aria-label={`Delete ${doc.file_name}`}
                                        >
                                            X Emojii
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {/* Image preview model */}
            {previewUrl && (
                <DocumentPreview
                    url={previewUrl}
                    fileName={previewFileName}
                    onClose={() => {
                        setPreviewUrl(null);
                        setPreviewFileName("");
                    }}
                />
            )}
        </div>
    );
}