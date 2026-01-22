/**
 * Storage Interface
 *
 * Defines the contract for object storage operations.
 * Implementations can use different providers (Cloudflare R2, AWS S3, etc.).
 *
 * @module StorageInterface
 */

import { Readable } from 'stream';

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
 * Parameters for streaming upload
 */
export interface StreamUploadParams {
  /** Organization ID for multi-tenant isolation */
  organizationId: string;
  /** Unique document ID */
  documentId: string;
  /** File extension (e.g., "pdf", "docx") */
  extension: string;
  /** Content-Type (e.g., "application/pdf") */
  contentType: string;
  /** Readable stream of file data */
  stream: Readable | Buffer;
  /** Optional configuration */
  options?: StreamUploadOptions;
}

/**
 * Configuration options for streaming uploads
 */
export interface StreamUploadOptions {
  /** Part size for multipart upload in bytes (default: 10MB) */
  partSize?: number;
  /** Progress callback function */
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  /** Number of bytes loaded */
  loaded: number;
  /** Total number of bytes (if known) */
  total?: number;
  /** Upload part number */
  part?: number;
}

/**
 * Result of streaming upload
 */
export interface StreamUploadResult {
  /** Object key in storage */
  key: string;
  /** Upload identifier (e.g., ETag) */
  uploadId?: string;
  /** Location/URL of uploaded object */
  location?: string;
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

  /**
   * Upload file using streaming (for large files)
   *
   * @param params Stream upload parameters
   * @returns Promise with upload result
   */
  uploadStream(params: StreamUploadParams): Promise<StreamUploadResult>;
}
