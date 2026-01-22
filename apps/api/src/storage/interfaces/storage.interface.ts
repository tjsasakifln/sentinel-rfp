/**
 * Storage Interface
 *
 * Defines the contract for object storage operations.
 * Implementations can use different providers (Cloudflare R2, AWS S3, etc.).
 *
 * @module StorageInterface
 */

/**
 * Configuration options for presigned URLs
 */
export interface PresignedUrlOptions {
  /** Expiration time in seconds (default: 900 for uploads, 3600 for downloads) */
  expiresIn?: number;
  /** Content-Type for the upload/download */
  contentType?: string;
  /** Content-Disposition for download (e.g., "attachment; filename=document.pdf") */
  contentDisposition?: string;
}

/**
 * Parameters for generating upload URL
 */
export interface UploadUrlParams {
  /** Organization ID for multi-tenant isolation */
  organizationId: string;
  /** Unique document ID */
  documentId: string;
  /** File extension (e.g., "pdf", "docx") */
  extension: string;
  /** Content-Type (e.g., "application/pdf") */
  contentType: string;
  /** Optional presigned URL configuration */
  options?: PresignedUrlOptions;
}

/**
 * Parameters for generating download URL
 */
export interface DownloadUrlParams {
  /** Organization ID for multi-tenant isolation */
  organizationId: string;
  /** Unique document ID */
  documentId: string;
  /** File extension (e.g., "pdf", "docx") */
  extension: string;
  /** Original filename for Content-Disposition */
  filename?: string;
  /** Optional presigned URL configuration */
  options?: PresignedUrlOptions;
}

/**
 * Result of presigned URL generation
 */
export interface PresignedUrlResult {
  /** Pre-signed URL for upload/download */
  url: string;
  /** Object key in storage */
  key: string;
  /** Expiration timestamp (ISO 8601) */
  expiresAt: string;
}

/**
 * Storage service interface
 *
 * All storage implementations must implement this interface.
 */
export interface IStorageService {
  /**
   * Generate presigned URL for file upload
   *
   * @param params Upload URL parameters
   * @returns Promise with presigned URL details
   */
  generatePresignedUploadUrl(params: UploadUrlParams): Promise<PresignedUrlResult>;

  /**
   * Generate presigned URL for file download
   *
   * @param params Download URL parameters
   * @returns Promise with presigned URL details
   */
  generatePresignedDownloadUrl(params: DownloadUrlParams): Promise<PresignedUrlResult>;
}
