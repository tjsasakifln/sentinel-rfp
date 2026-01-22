import { Module } from '@nestjs/common';

import { TypeDetectorService } from './detection/type-detector.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { UploadService } from './upload/upload.service';

/**
 * Module for document management
 * Handles file upload, validation, metadata extraction, and type detection
 */
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, UploadService, TypeDetectorService],
  exports: [DocumentsService, UploadService, TypeDetectorService],
})
export class DocumentsModule {}
