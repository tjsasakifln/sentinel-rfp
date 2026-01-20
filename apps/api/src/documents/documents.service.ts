import { Injectable, Logger } from '@nestjs/common';

import { UploadDocumentDto, BatchUploadDto } from './dto/upload.dto';
import { UploadService } from './upload/upload.service';

/**
 * Document upload response
 */
export interface DocumentUploadResponse {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedAt: Date;
}

/**
 * Batch upload response
 */
export interface BatchUploadResponse {
  total: number;
  successful: number;
  failed: number;
  documents: DocumentUploadResponse[];
}

/**
 * Service for managing documents
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload a single document
   */
  async uploadDocument(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
  ): Promise<DocumentUploadResponse> {
    this.logger.log(`Uploading document: ${file.originalname}`);

    try {
      // Extract and validate file metadata
      const metadata = await this.uploadService.extractMetadata(file);

      // TODO: Store file in Cloudflare R2 (Issue #26)
      // TODO: Create document record in database
      // TODO: Queue processing job (Issue #FEAT-016)

      const response: DocumentUploadResponse = {
        id: metadata.id,
        name: dto.name || metadata.originalName,
        originalName: metadata.originalName,
        size: metadata.size,
        mimeType: metadata.mimeType,
        status: 'pending',
        uploadedAt: new Date(),
      };

      this.logger.log(`Document uploaded successfully: ${response.id} (${response.size} bytes)`);

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to upload document: ${file.originalname}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Upload multiple documents in batch
   */
  async uploadBatch(
    files: Express.Multer.File[],
    dto: BatchUploadDto,
  ): Promise<BatchUploadResponse> {
    this.logger.log(`Uploading batch of ${files.length} documents`);

    try {
      // Validate batch
      this.uploadService.validateBatch(files);

      // Upload each file
      const uploadPromises = files.map((file) =>
        this.uploadDocument(file, {
          name: dto.batchPrefix ? `${dto.batchPrefix}-${file.originalname}` : file.originalname,
        }).catch((error) => {
          this.logger.warn(`Failed to upload file in batch: ${file.originalname}`, error.message);
          return null; // Return null for failed uploads
        }),
      );

      const results = await Promise.all(uploadPromises);

      // Filter successful uploads
      const successful = results.filter(
        (result): result is DocumentUploadResponse => result !== null,
      );

      const response: BatchUploadResponse = {
        total: files.length,
        successful: successful.length,
        failed: files.length - successful.length,
        documents: successful,
      };

      this.logger.log(
        `Batch upload completed: ${response.successful}/${response.total} successful`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to upload batch`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
