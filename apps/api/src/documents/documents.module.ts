import { Module } from '@nestjs/common';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { UploadService } from './upload/upload.service';

/**
 * Module for document management
 * Handles file upload, validation, and metadata extraction
 */
@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, UploadService],
  exports: [DocumentsService, UploadService],
})
export class DocumentsModule {}
