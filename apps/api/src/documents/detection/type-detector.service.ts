import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as FileType from 'file-type';

import {
  SUPPORTED_MIME_TYPES,
  ParserType,
  getParserTypeFromMimeType,
  getParserTypeFromExtension,
  getAllSupportedExtensions,
} from './mime-types';

/**
 * Result of document type detection
 */
export interface DocumentTypeDetectionResult {
  /**
   * Detected MIME type (from magic bytes or extension fallback)
   */
  mimeType: string;

  /**
   * File extension (normalized to lowercase with dot)
   */
  extension: string;

  /**
   * Parser type to use for this document
   */
  parserType: ParserType;

  /**
   * Detection method used
   */
  detectionMethod: 'MAGIC_BYTES' | 'EXTENSION_FALLBACK';

  /**
   * Whether the file type is supported
   */
  isSupported: boolean;
}

/**
 * Service for detecting document types using magic bytes and extension validation
 * Implements RF-001 requirement for accurate document type detection
 */
@Injectable()
export class TypeDetectorService {
  private readonly logger = new Logger(TypeDetectorService.name);

  /**
   * Detect document type from file buffer
   * Primary method: Magic bytes detection using file-type library
   * Fallback: Extension-based detection
   *
   * @param buffer File buffer (first few KB is enough for magic bytes)
   * @param filename Original filename (for extension fallback)
   * @returns DocumentTypeDetectionResult
   * @throws BadRequestException if file type is not supported
   */
  async detectType(buffer: Buffer, filename: string): Promise<DocumentTypeDetectionResult> {
    this.logger.debug(`Detecting type for file: ${filename}`);

    // Step 1: Try magic bytes detection (primary method)
    const magicBytesResult = await this.detectByMagicBytes(buffer);

    if (magicBytesResult) {
      this.logger.log(`File type detected via magic bytes: ${magicBytesResult.mimeType}`);
      return magicBytesResult;
    }

    // Step 2: Fallback to extension-based detection
    this.logger.debug('Magic bytes detection failed, using extension fallback');
    const extensionResult = this.detectByExtension(filename);

    if (extensionResult) {
      this.logger.warn(`File type detected via extension fallback: ${extensionResult.mimeType}`);
      return extensionResult;
    }

    // Step 3: Neither method worked - unsupported type
    const extension = this.extractExtension(filename);
    const supportedExtensions = getAllSupportedExtensions().join(', ');

    throw new BadRequestException(
      `Unsupported file type "${extension}". Supported types: ${supportedExtensions}`,
    );
  }

  /**
   * Detect type using magic bytes (file signature)
   * Most reliable method for file type detection
   *
   * @param buffer File buffer
   * @returns DocumentTypeDetectionResult or null if detection fails
   */
  private async detectByMagicBytes(buffer: Buffer): Promise<DocumentTypeDetectionResult | null> {
    try {
      const fileTypeResult = await FileType.fromBuffer(buffer);

      if (!fileTypeResult) {
        return null;
      }

      const { mime, ext } = fileTypeResult;

      // Check if detected MIME type is supported
      const parserType = getParserTypeFromMimeType(mime);

      if (!parserType) {
        this.logger.warn(`Detected unsupported MIME type via magic bytes: ${mime}`);
        return null;
      }

      return {
        mimeType: mime,
        extension: `.${ext}`,
        parserType,
        detectionMethod: 'MAGIC_BYTES',
        isSupported: true,
      };
    } catch (error) {
      this.logger.error('Magic bytes detection error:', error);
      return null;
    }
  }

  /**
   * Detect type using file extension (fallback method)
   * Less reliable than magic bytes but useful for certain file types
   *
   * @param filename Original filename
   * @returns DocumentTypeDetectionResult or null if detection fails
   */
  private detectByExtension(filename: string): DocumentTypeDetectionResult | null {
    const extension = this.extractExtension(filename);

    if (!extension) {
      return null;
    }

    const parserType = getParserTypeFromExtension(extension);

    if (!parserType) {
      return null;
    }

    // Find MIME type from parser type
    const mimeTypeEntry = Object.values(SUPPORTED_MIME_TYPES).find(
      (type) => type.parserType === parserType,
    );

    if (!mimeTypeEntry) {
      return null;
    }

    return {
      mimeType: mimeTypeEntry.mimeType,
      extension,
      parserType,
      detectionMethod: 'EXTENSION_FALLBACK',
      isSupported: true,
    };
  }

  /**
   * Extract and normalize file extension from filename
   *
   * @param filename Original filename
   * @returns Normalized extension (lowercase with dot) or empty string
   */
  private extractExtension(filename: string): string {
    const parts = filename.split('.');

    if (parts.length < 2) {
      return '';
    }

    const extension = parts.pop()?.toLowerCase();
    return extension ? `.${extension}` : '';
  }

  /**
   * Validate if file type is supported
   *
   * @param mimeType MIME type to check
   * @returns true if supported, false otherwise
   */
  isSupportedMimeType(mimeType: string): boolean {
    return Object.values(SUPPORTED_MIME_TYPES).some((type) => type.mimeType === mimeType);
  }

  /**
   * Validate if extension is supported
   *
   * @param extension File extension (with or without dot)
   * @returns true if supported, false otherwise
   */
  isSupportedExtension(extension: string): boolean {
    const normalizedExt = extension.startsWith('.')
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`;

    return Object.values(SUPPORTED_MIME_TYPES).some((type) =>
      type.extensions.includes(normalizedExt),
    );
  }
}
