/**
 * Cloudflare R2 Storage Service
 *
 * Implements object storage operations using Cloudflare R2 (S3-compatible API).
 * Provides presigned URLs for direct client-to-storage uploads/downloads.
 *
 * @module R2Service
 */

import { S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IStorageService,
  UploadUrlParams,
  DownloadUrlParams,
  PresignedUrlResult,
} from './interfaces/storage.interface';

/**
 * Cloudflare R2 configuration interface
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

@Injectable()
export class R2Service implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(R2Service.name);
  private s3Client!: S3Client;
  private config!: R2Config;
  private initialized = false;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize R2 client on module initialization
   *
   * Validates required environment variables and creates S3Client instance.
   * R2 uses S3-compatible API, so we use AWS SDK S3 client with R2 endpoint.
   *
   * If R2 environment variables are not configured, logs a warning and skips initialization.
   * This allows the service to be loaded in environments where R2 is not yet configured
   * (e.g., CI/CD, development, testing).
   */
  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize S3Client with R2 configuration
   *
   * If required environment variables are missing, logs a warning and skips initialization.
   * Service methods will throw errors if called before successful initialization.
   */
  async initialize(): Promise<void> {
    this.logger.log('Initializing Cloudflare R2 client...');

    // Check if R2 configuration exists
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    if (!accountId) {
      this.logger.warn(
        'R2 environment variables not configured - R2 storage is disabled. ' +
          'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME to enable.',
      );
      return;
    }

    // Load configuration from environment variables
    this.config = {
      accountId,
      accessKeyId: this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      bucketName: this.configService.getOrThrow<string>('R2_BUCKET_NAME'),
    };

    // Construct R2 endpoint URL
    // Format: https://{account_id}.r2.cloudflarestorage.com
    const endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`;

    // Initialize S3Client with R2 endpoint
    this.s3Client = new S3Client({
      region: 'auto', // R2 requires 'auto' region
      endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.initialized = true;
    this.logger.log('R2 client initialized successfully');
    this.logger.log(`Bucket: ${this.config.bucketName}`);
  }

  /**
   * Ensure R2 service is properly initialized before use
   *
   * @throws Error if R2 service was not initialized due to missing configuration
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        'R2 service is not initialized. Please configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables.',
      );
    }
  }

  /**
   * Generate presigned URL for file upload
   *
   * Creates a time-limited URL that allows direct upload to R2 without
   * exposing credentials. URL expires after 15 minutes by default.
   *
   * @param params Upload URL parameters
   * @returns Promise with presigned URL details
   *
   * @example
   * ```typescript
   * const result = await r2Service.generatePresignedUploadUrl({
   *   organizationId: 'org_123',
   *   documentId: 'doc_456',
   *   extension: 'pdf',
   *   contentType: 'application/pdf'
   * });
   * // Returns: { url: 'https://...', key: 'org_123/documents/doc_456/original.pdf', expiresAt: '...' }
   * ```
   */
  async generatePresignedUploadUrl(_params: UploadUrlParams): Promise<PresignedUrlResult> {
    this.ensureInitialized();
    // Implementation will be added in sub-issue #202
    throw new Error('Not implemented yet - see issue #202');
  }

  /**
   * Generate presigned URL for file download
   *
   * Creates a time-limited URL that allows direct download from R2 without
   * exposing credentials. URL expires after 60 minutes by default.
   *
   * @param params Download URL parameters
   * @returns Promise with presigned URL details
   *
   * @example
   * ```typescript
   * const result = await r2Service.generatePresignedDownloadUrl({
   *   organizationId: 'org_123',
   *   documentId: 'doc_456',
   *   extension: 'pdf',
   *   filename: 'my-document.pdf'
   * });
   * // Returns: { url: 'https://...', key: 'org_123/documents/doc_456/original.pdf', expiresAt: '...' }
   * ```
   */
  async generatePresignedDownloadUrl(_params: DownloadUrlParams): Promise<PresignedUrlResult> {
    this.ensureInitialized();
    // Implementation will be added in sub-issue #203
    throw new Error('Not implemented yet - see issue #203');
  }

  /**
   * Get S3Client instance for testing purposes
   *
   * @returns S3Client instance
   * @throws Error if R2 service was not initialized
   * @internal
   */
  getClient(): S3Client {
    this.ensureInitialized();
    return this.s3Client;
  }

  /**
   * Get R2 configuration
   *
   * @returns R2 configuration (credentials excluded for security)
   * @throws Error if R2 service was not initialized
   * @internal
   */
  getConfig(): Omit<R2Config, 'accessKeyId' | 'secretAccessKey'> {
    this.ensureInitialized();
    return {
      accountId: this.config.accountId,
      bucketName: this.config.bucketName,
    };
  }

  /**
   * Check if R2 service is initialized and ready to use
   *
   * @returns true if service is initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
