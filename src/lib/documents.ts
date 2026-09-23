import type { FileValidationResult, AllowedMimeType } from "@/lib/types/documents";

/**
 * Allowed MIME types for document uploads.
 */
export const ALLOWED_MIME_TYPES: readonly AllowedMimeType[] = [
    "application/pdf",
    "image/jpeg",
    "image/png",
];

/**
 * Maximum file size: 10MB.
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum file name length.
 */
export const MAX_FILE_NAME_LENGTH = 255;

/**
 * Validate a file's name, MIME type, and size before upload.
 */
export function validateFile(
    fileName: string,
    mimeType: string,
    fileSize: number
): FileValidationResult {
    if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
        return {
            valid: false,
            error: "File type not allowed. Accepted: PDF, JPG, PNG",
        };
    }

    if (fileSize <= 0) {
        return { valid: false, error: "File is empty" };
    }

    if (fileSize > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size exceeds 10 MB limit. Your file is ${formatFileSize(fileSize)}.`,
        };
    }

    if (!fileName || !fileName.trim()) {
        return { valid: false, error: "File name is required" };
    }

    if (fileName.length > MAX_FILE_NAME_LENGTH) {
        return { valid: false, error: "File name too long (max 255 characters)" };
    }

    return { valid: true };
}


/**
 * Sanitize a file name by stripping dangerous characters.
 * 
 * Security-critical: prevents path traversal attacks.
 * Strips: /, \, .., null bytes, control characters (0x00-0x1F, 0x7F).
 */
export function sanitizeFileName(name: string): string {
    let sanitized = name;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, "");

    // Remove control characters (0x00-0x1F and 0x7F)
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, "");

    // Replace path separators with underscore
    sanitized = sanitized.replace(/[\/\\]/g, "_");

    // Remove all ".." sequences (path traversal)
    sanitized = sanitized.replace(/\.\./g, "");

    // Trim whitespace
    sanitized = sanitized.trim();

    // Collapse multiple consecutive underscores
    sanitized = sanitized.replace(/_+/g, "_");

    // Truncate to max length
    sanitized = sanitized.slice(0, MAX_FILE_NAME_LENGTH);

    // If empty after sanitization, use default name
    if (!sanitized) {
        return "document";
    }

    return sanitized;
}

/**
 * Generate a storage path for a document.
 * 
 * Format: {orgId}/{propertyId}/{complianceType}/{timestamp}_{sanitizedFileName}
 * No leading slash (Supabase storage paths are relative to bucket root).
 */
export function generateStoragePath(
    orgId: string,
    propertyId: string,
    complianceType: string,
    fileName: string
): string {
    const sanitized = sanitizeFileName(fileName);
    const timestamp = Date.now();
    const path = `${orgId}/${propertyId}/${complianceType}/${timestamp}_${sanitized}`;
    
    // Final validation: belt-and-suspenders check
    if (path.includes("..") || path.startsWith("/")) {
        throw new Error("Invalid storage path generated");
    }

    return path;
}

/**
 * Format file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if a MIME type is an image type (for preview capability)
 */
export function isImageMimeType(mime: string): boolean {
    return mime === "image/jpeg" || mime === "image/png";
}