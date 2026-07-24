/**
 * Union type of permitted MIME types for document uploads.
 */
export type AllowedMimeType = "application/pdf" | "image/jpeg" | "image/png";

/**
 * Represents a row from the `documents` table in Supabase.
 */
export interface DocumentRow {
    id: string;
    compliance_item_id: string;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: AllowedMimeType;
    version: number;
    uploaded_at: string | null; // ISO timestamp; null = pending upload
}

/**
 * Result of client-side or server-side file validation
 */
export interface FileValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Upload state machine states for the DocumentUpload component.
 */
export type UploadState =
    | "idle"
    | "uploading"
    | "confirming"
    | "success"
    | "error";

/**
 * Metadata passed to the upload URL request.
 */
export interface UploadFileMetadata {
    compliance_item_id: string;
    file_name: string;
    mime_type: string;
    file_size: number;
}