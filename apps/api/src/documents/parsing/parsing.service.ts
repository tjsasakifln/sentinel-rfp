import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ParsedDocument, DocumentType } from './types';

/**
 * Parsing Service
 * Base service for document parsing operations
 *
 * This service acts as a facade, delegating to specific parsers
 * based on document type (PDF, DOCX, etc.)
 */
@Injectable()
export class ParsingService {
  private readonly logger = new Logger(ParsingService.name);

  constructor(private readonly configService: ConfigService) {
    this.validateConfiguration();
  }

  /**
   * Parse a document based on its type
   *
   * @param file - File buffer or path to parse
   * @param type - Document type (pdf, docx, xlsx, image)
   * @returns Parsed document structure
   *
   * @example
   * ```typescript
   * const result = await parsingService.parseDocument(fileBuffer, DocumentType.PDF);
   * console.log(`Parsed ${result.pages.length} pages`);
   * ```
   */
  async parseDocument(file: Buffer | string, type: DocumentType): Promise<ParsedDocument> {
    this.logger.log(`Starting document parsing: type=${type}`);

    try {
      // Validation
      if (!file) {
        throw new BadRequestException('File is required for parsing');
      }

      // Future implementation: delegate to specific parsers
      // For now, this is a placeholder that will be implemented in sub-issues:
      // - #214 (PDF): await this.pdfParser.parse(file)
      // - #215 (DOCX): await this.docxParser.parse(file)
      // - #216 (OCR/Image): await this.ocrService.extractText(file)

      throw new Error(
        `Parser for type '${type}' not yet implemented. ` +
          `This will be added in sub-issues #214, #215, #216.`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Document parsing failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Validate required configuration
   * @private
   */
  private validateConfiguration(): void {
    const requiredVars = ['UNSTRUCTURED_API_KEY', 'OPENAI_API_KEY'];
    const missing = requiredVars.filter((key) => !this.configService.get<string>(key));

    if (missing.length > 0) {
      this.logger.warn(
        `Missing environment variables: ${missing.join(', ')}. ` +
          `Document parsing features will be limited.`,
      );
    } else {
      this.logger.log('Parsing service configuration validated successfully');
    }
  }

  /**
   * Check if parsing service is ready
   * @returns true if all required dependencies are configured
   */
  isReady(): boolean {
    const unstructuredKey = this.configService.get<string>('UNSTRUCTURED_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    return Boolean(unstructuredKey && openaiKey);
  }
}
