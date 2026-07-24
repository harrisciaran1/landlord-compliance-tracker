/**
 * Request body for POST /api/documents/upload-url
 */
export interface UploadUrlRequest {
    compliance_item_id: string;
    file_name: string;
    mime_type: string;
    file_size: number;
}

/**
 * Successful response from POST /api/documents/upload-url
 */
export interface UploadUrlResponse {
    upload_url: string;
    upload_token: string;
    document_id: string;
    path: string;
}

/**
 * Error response from the upload URL endpoint.
 */
export interface UploadUrlErrorResponse {
    error: string;
}