import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * Allowed document types with their MIME types
 */
export const ALLOWED_DOCUMENT_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_BATCH_FILES = 50;

/**
 * File metadata extracted from upload
 */
export interface FileMetadata {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
}

/**
 * Service for handling file upload validation and metadata extraction
 */
@Injectable()
export class UploadService {
  /**
   * Validate file size
   */
  validateFileSize(file: Express.Multer.File): void {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  /**
   * Validate file type by extension and MIME type
   * Note: For MVP, we're using extension-based validation.
   * TODO: Add magic number validation in future security enhancement (Issue #TBD)
   */
  async validateFileType(file: Express.Multer.File): Promise<string> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();

    // Map extensions to MIME types
    const extensionToMimeType: Record<string, string> = {
      pdf: ALLOWED_DOCUMENT_TYPES.PDF,
      docx: ALLOWED_DOCUMENT_TYPES.DOCX,
      xlsx: ALLOWED_DOCUMENT_TYPES.XLSX,
      pptx: ALLOWED_DOCUMENT_TYPES.PPTX,
    };

    if (!extension || !extensionToMimeType[extension]) {
      throw new BadRequestException(
        `File type "${extension}" is not supported. Allowed types: PDF, DOCX, XLSX, PPTX`,
      );
    }

    return extensionToMimeType[extension];
  }

  /**
   * Extract file metadata
   */
  async extractMetadata(file: Express.Multer.File): Promise<FileMetadata> {
    // Validate file size
    this.validateFileSize(file);

    // Validate and get actual MIME type
    const mimeType = await this.validateFileType(file);

    // Generate unique document ID (UUID v4)
    const id = uuidv4();

    // Extract file extension from original name
    const extension = file.originalname.split('.').pop()?.toLowerCase() || '';

    return {
      id,
      originalName: file.originalname,
      size: file.size,
      mimeType,
      extension,
    };
  }

  /**
   * Validate batch upload
   */
  validateBatch(files: Express.Multer.File[]): void {
    if (files.length > MAX_BATCH_FILES) {
      throw new BadRequestException(
        `Batch upload exceeds maximum allowed files (${MAX_BATCH_FILES})`,
      );
    }

    if (files.length === 0) {
      throw new BadRequestException('No files provided for upload');
    }
  }

  /**
   * Extract metadata for multiple files
   */
  async extractBatchMetadata(files: Express.Multer.File[]): Promise<FileMetadata[]> {
    this.validateBatch(files);

    const metadataPromises = files.map((file) => this.extractMetadata(file));
    return Promise.all(metadataPromises);
  }
}
