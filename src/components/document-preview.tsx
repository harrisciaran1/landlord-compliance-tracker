"use client";

import React, { useEffect, useRef, useCallback } from "react";
import DocumentList from "./document-list";

/**
 * Props for the DocumentPreview modal component
 */
export interface DocumentPreviewProps {
    url: string;
    fileName: string;
    onClose: () => void;
}

/**
 * DocumentPreview - Client Component (Modal)
 * 
 * Image preview modal for uploaded documents.
 * Only used for images (PDF opens in a new tab instead).
 * 
 */
export default function DocumentPreview({
    url,
    fileName,
    onClose,
}: DocumentPreviewProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Focus the close button on mount
    useEffect(() => {
        closeButtonRef.current?.focus();
    }, []);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // TODO: Implement focus trap
    // - Track focusable elements within modal
    // - On Tab at last element, cycle to first
    // - On Shift+Tab at first element, cycle to last

    const handleBackdropClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) {
                onClose();
            }
        },
        [onClose]
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
        >
            <div
                ref={modalRef}
                className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2
                        id="preview-title"
                        className="truncate text-lg font-medium text-gray-900"
                    >
                        {fileName}
                    </h2>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] rounded p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" aria-label="Close preview"
                    >
                        X emojii
                    </button>
                </div>

                {/* Image */}
                <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={url}
                        alt={`Preview of ${fileName}`}
                        className="max-h-[70vh] max-w-full object-contain"
                    />

                    {/* Footer */}
                    <div className="flex items-center justify-end border-t px-4 py-3">
                        <a
                            href={url}
                            download={fileName}
                            className="min-h-[44px] rounded px-4 py-2 text-sm font-medium text-blue-600 hover:g-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Download full size
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}