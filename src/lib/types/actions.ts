/**
 * Generic server action result type.
 * Discriminated union for success/error outcomes.
 */
export type ActionResult<T = void> =
    | { success: true; data: T }
    | { success: false; error: string };

/**
 * Result from getDocumentDownloadUrl action
 */
export interface DownloadUrlResult {
    url: string;
    mime_type: string;
    file_name: string;
}