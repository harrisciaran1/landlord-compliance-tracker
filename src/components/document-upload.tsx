"use client";

import React, { useState, useRef, useCallback } from "react";
import { validateFile, ALLOWED_MIME_TYPES, MAX_FILE_SIZE, formatFileSize } from "@/lib/documents";
import { confirmDocumentUpload } from "@/app/dashboard/properties/actions";
import type { UploadUrlResponse } from "@/lib/types/api";
import { RSCPathnameNormalizer } from "next/dist/server/normalizers/request/rsc";
import { CLIENT_STATIC_FILES_RUNTIME_REACT_REFRESH } from "next/dist/shared/lib/constants";

export interface DocumentUploadProps {
    complianceItemId: string;
}

type UploadPhase =
    | { phase: "idle" }
    | { phase: "uploading"; progress: number; fileName: string; fileSize: number }
    | { phase: "confirming"; fileName: string }
    | {phase: "success"; fileName: string }
    | { phase: "error"; message: string };

/**
 * DocumentUpload - Client Component
 * 
 * File picker + XHR upload with progress tracking.
 * State machine: idle -> uploading -> confirming -> success -> error
 */
export default function DocumentUpload({ complianceItemId }: DocumentUploadProps) {
    const [state, setState] = useState<UploadPhase>({ phase: "idle" });
    const [announcement, setAnnouncement] = useState("");
    const xhrRef = useRef<XMLHttpRequest | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Client-side validation
            const validation = validateFile(file.name, file.type, file.size);
            if (!validation.valid) {
                setState({ phase: "error", message: validation.error! });
                setAnnouncement(validation.error!);
                return;
            }

            setState({ phase: "uploading", progress: 0, fileName: file.name, fileSize: file.size });
            setAnnouncement(`Uploading ${file.name}`);

            try {
                // 1. Request signed upload URL
                const res = await fetch("/api/documents/upload-url", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest" 
                    },
                    body: JSON.stringify({
                        compliance_item_id: complianceItemId,
                        file_name: file.name,
                        mime_type: file.type,
                        file_size: file.size,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Failed to start upload");
                }

                const { upload_url, upload_token, document_id } =
                    (await res.json()) as UploadUrlResponse;

                // 2. Upload file via XHR (for progress tracking)
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhrRef.current = xhr;

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const progress = Math.round((event.loaded / event.total) * 100);
                            setState({
                                phase: "uploading",
                                progress,
                                fileName: file.name,
                                fileSize: file.size,
                            });
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve();
                        } else {
                            reject(new Error("Upload failed"));
                        }
                    };

                    xhr.onerror = () => reject(new Error("Network error during upload"));
                    xhr.ontimeout = () => reject(new Error("Upload timed out"));
                    xhr.onabort = () => reject(new Error("Upload cancelled"));

                    xhr.open("PUT", upload_url);
                    xhr.setRequestHeader("Authorization", `Bearer ${upload_token}`);
                    xhr.setRequestHeader("Content-Type", file.type);
                    xhr.send(file);
                });

                xhrRef.current = null;

                // 3. Confirm upload 
                setState({ phase: "confirming", fileName: file.name });
                setAnnouncement("Finalising upload...");

                const result = await confirmDocumentUpload(document_id);
                if (result && "error" in result && result.error) {
                    throw new Error(result.error);
                }

                // 4. Success
                setState({ phase: "success", fileName: file.name });
                setAnnouncement(`Upload complete: ${file.name}`);

                // Auto-dismiss after 3 seconds
                setTimeout(() => {
                    setState({ phase: "idle" });
                    setAnnouncement("");
                }, 3000);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Upload failed";
                if (message !== "Upload cancelled") {
                    setState({ phase: "error", message });
                    setAnnouncement(`Upload failed: ${message}`);
                }
            }
            
            // Reset file input 
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
        [complianceItemId]
    );

    const handleCancel = useCallback(() => {
        if (xhrRef.current) {
            xhrRef.current.abort();
            xhrRef.current = null;
        }
        setState({ phase: "idle" });
        setAnnouncement("Upload cancelled");
    }, []);

    return (
        <div className="mt-3">
            {/* Screen reader announcement */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {announcement}
            </div>

            {state.phase === "idle" && (
                <div className="rounded-md border-2 border-dashed border-gray-300 p-3">
                    <label className="flex cursor-pointer flex-col items-center gap-1 sm:flex-row sm:gap-3">
                        <span className="inline-flex min-h-[44px] items-center rounded-md bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-700">
                            @ Upload document
                        </span>
                        <span className="text-xs text-gray-500">
                            PDF, JPG, or PNG . Max {formatFileSize(MAX_FILE_SIZE)}
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ALLOWED_MIME_TYPES.join(",")}
                            onChange={handleFileSelect}
                            className="sr-only"
                            aria-label="Choose document file to upload"
                        />
                    </label>
                </div>
            )}

            {state.phase === "uploading" && (
                <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-gray-700">{state.fileName}</span>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="min-h-[44px] rounded px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            aria-label="Cancel upload"
                        >
                            Cancel
                        </button>
                    </div>
                    <div
                        role="progressbar"
                        aria-valuenow={state.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Uploading ${state.fileName}: ${state.progress} percent complete`}
                    >
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div 
                                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                                style={{ width: `${state.progress}%` }}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-600">
                        {state.progress}% . {formatFileSize(Math.round(state.fileSize *state.progress / 100))} of {formatFileSize(state.fileSize)}
                    </p>
                </div>
            )}

            {state.phase === "confirming" && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm text-gray-600">Finalising {state.fileName}...</p>
                </div>
            )}

            {state.phase === "success" && (
                <div className="rounded-md border border-green-200 bg-green-50 p-3">
                    <p className="text-sm text-green-700">Tick emojii Uploaded {state.fileName}</p>
                </div>
            )}

            {state.phase === "error" && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                        <span className="shrink-0 text-red-600" aria-hidden="true">X</span>
                        <div>
                            <p className="text-sm font-medium text-red-800">Upload failed</p>
                            <p className="mt-0.5 text-sm text-red-700">{state.message}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setState({ phase: "idle" })}
                        className="mt-2 min-h-[44px] rounded-md border border-red-300 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Try again
                    </button>
                </div>
            )}
        </div>
    );
}