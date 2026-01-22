import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { ParserType } from '../detection/mime-types';
import { TypeDetectorService } from '../detection/type-detector.service';

/**
 * Allowed document types with their MIME types
 * @deprecated Use TypeDetectorService for type detection
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
  parserType?: ParserType;
  detectionMethod?: 'MAGIC_BYTES' | 'EXTENSION_FALLBACK';
}

/**
 * Service for handling file upload validation and metadata extraction
 * Now uses TypeDetectorService for accurate magic bytes detection (Issue #27)
 */
@Injectable()
export class UploadService {
  constructor(private readonly typeDetectorService: TypeDetectorService) {}
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
   * Validate file type using magic bytes detection (Issue #27)
   * Uses TypeDetectorService for accurate file type detection
   *
   * @param file Uploaded file
   * @returns DocumentTypeDetectionResult with MIME type, extension, and parser type
   */
  async validateFileType(file: Express.Multer.File) {
    // Use TypeDetectorService for magic bytes detection
    const detectionResult = await this.typeDetectorService.detectType(
      file.buffer,
      file.originalname,
    );

    return detectionResult;
  }

  /**
   * Extract file metadata with magic bytes detection
   */
  async extractMetadata(file: Express.Multer.File): Promise<FileMetadata> {
    // Validate file size
    this.validateFileSize(file);

    // Validate and detect file type using magic bytes
    const typeDetection = await this.validateFileType(file);

    // Generate unique document ID (UUID v4)
    const id = uuidv4();

    return {
      id,
      originalName: file.originalname,
      size: file.size,
      mimeType: typeDetection.mimeType,
      extension: typeDetection.extension,
      parserType: typeDetection.parserType,
      detectionMethod: typeDetection.detectionMethod,
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
