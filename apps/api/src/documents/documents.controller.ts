import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../identity/auth/guards/jwt-auth.guard';

import { DocumentsService } from './documents.service';
import { UploadDocumentDto, BatchUploadDto } from './dto/upload.dto';
import { MAX_FILE_SIZE, MAX_BATCH_FILES } from './upload/upload.service';

/**
 * Controller for document upload operations
 */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller({ path: 'documents', version: '1' })
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Upload a single document
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // Store in memory for processing
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a single document',
    description:
      'Upload a document file (PDF, DOCX, XLSX, PPTX) for processing. Maximum file size: 100MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file to upload',
        },
        name: {
          type: 'string',
          description: 'Optional custom name for the document',
          maxLength: 255,
        },
        description: {
          type: 'string',
          description: 'Optional description or notes',
          maxLength: 1000,
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        originalName: { type: 'string' },
        size: { type: 'number' },
        mimeType: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or size exceeds limit',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadDocumentDto) {
    return this.documentsService.uploadDocument(file, dto);
  }

  /**
   * Upload multiple documents in batch
   */
  @Post('upload/batch')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', MAX_BATCH_FILES, {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload multiple documents in batch',
    description: 'Upload up to 50 documents at once. Each file must be under 100MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Array of document files to upload',
        },
        batchPrefix: {
          type: 'string',
          description: 'Optional prefix for all uploaded documents',
          maxLength: 100,
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Batch upload completed',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        successful: { type: 'number' },
        failed: { type: 'number' },
        documents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              originalName: { type: 'string' },
              size: { type: 'number' },
              mimeType: { type: 'string' },
              status: { type: 'string' },
              uploadedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid files or batch size exceeds limit',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  async uploadBatch(@UploadedFiles() files: Express.Multer.File[], @Body() dto: BatchUploadDto) {
    return this.documentsService.uploadBatch(files, dto);
  }
}
