import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ParsingService } from './parsing.service';

/**
 * Parsing Module
 * Provides document parsing capabilities for PDF, DOCX, XLSX, and images
 *
 * Features:
 * - Multi-format document parsing via Unstructured.io
 * - OCR support via GPT-4o Vision
 * - Hierarchical structure detection
 * - Table extraction
 * - Metadata extraction
 *
 * Configuration:
 * - UNSTRUCTURED_API_KEY: API key for Unstructured.io
 * - OPENAI_API_KEY: API key for OpenAI (GPT-4o Vision)
 */
@Module({
  imports: [ConfigModule],
  providers: [ParsingService],
  exports: [ParsingService],
})
export class ParsingModule {}
