import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ParserType } from '../detection/mime-types';
import { TypeDetectorService } from '../detection/type-detector.service';

import {
  UploadService,
  MAX_FILE_SIZE,
  MAX_BATCH_FILES,
  ALLOWED_DOCUMENT_TYPES,
} from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let typeDetectorService: TypeDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: TypeDetectorService,
          useValue: {
            detectType: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    typeDetectorService = module.get<TypeDetectorService>(TypeDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFileSize', () => {
    it('should pass for valid file size', () => {
      const file = {
        size: 50 * 1024 * 1024, // 50MB
      } as Express.Multer.File;

      expect(() => service.validateFileSize(file)).not.toThrow();
    });

    it('should throw BadRequestException for file exceeding max size', () => {
      const file = {
        size: 101 * 1024 * 1024, // 101MB
      } as Express.Multer.File;

      expect(() => service.validateFileSize(file)).toThrow(BadRequestException);
      expect(() => service.validateFileSize(file)).toThrow(
        /File size exceeds maximum allowed size/,
      );
    });
  });

  describe('validateFileType', () => {
    it('should validate PDF file type using TypeDetectorService', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'test.pdf',
      } as Express.Multer.File;

      const mockDetectionResult = {
        mimeType: ALLOWED_DOCUMENT_TYPES.PDF,
        extension: '.pdf',
        parserType: ParserType.PDF_PARSER,
        detectionMethod: 'MAGIC_BYTES' as const,
        isSupported: true,
      };

      jest.spyOn(typeDetectorService, 'detectType').mockResolvedValue(mockDetectionResult);

      const result = await service.validateFileType(file);
      expect(result).toEqual(mockDetectionResult);
      expect(typeDetectorService.detectType).toHaveBeenCalledWith(file.buffer, file.originalname);
    });

    it('should validate DOCX file type using TypeDetectorService', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'document.docx',
      } as Express.Multer.File;

      const mockDetectionResult = {
        mimeType: ALLOWED_DOCUMENT_TYPES.DOCX,
        extension: '.docx',
        parserType: ParserType.DOCX_PARSER,
        detectionMethod: 'MAGIC_BYTES' as const,
        isSupported: true,
      };

      jest.spyOn(typeDetectorService, 'detectType').mockResolvedValue(mockDetectionResult);

      const result = await service.validateFileType(file);
      expect(result).toEqual(mockDetectionResult);
    });

    it('should validate XLSX file type using TypeDetectorService', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'spreadsheet.xlsx',
      } as Express.Multer.File;

      const mockDetectionResult = {
        mimeType: ALLOWED_DOCUMENT_TYPES.XLSX,
        extension: '.xlsx',
        parserType: ParserType.XLSX_PARSER,
        detectionMethod: 'EXTENSION_FALLBACK' as const,
        isSupported: true,
      };

      jest.spyOn(typeDetectorService, 'detectType').mockResolvedValue(mockDetectionResult);

      const result = await service.validateFileType(file);
      expect(result).toEqual(mockDetectionResult);
    });

    it('should validate PPTX file type using TypeDetectorService', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'presentation.pptx',
      } as Express.Multer.File;

      const mockDetectionResult = {
        mimeType: ALLOWED_DOCUMENT_TYPES.PPTX,
        extension: '.pptx',
        parserType: ParserType.PPTX_PARSER,
        detectionMethod: 'MAGIC_BYTES' as const,
        isSupported: true,
      };

      jest.spyOn(typeDetectorService, 'detectType').mockResolvedValue(mockDetectionResult);

      const result = await service.validateFileType(file);
      expect(result).toEqual(mockDetectionResult);
    });

    it('should throw for unsupported file type', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'test.jpg',
      } as Express.Multer.File;

      jest
        .spyOn(typeDetectorService, 'detectType')
        .mockRejectedValue(new BadRequestException('Unsupported file type ".jpg"'));

      await expect(service.validateFileType(file)).rejects.toThrow(BadRequestException);
      await expect(service.validateFileType(file)).rejects.toThrow(/Unsupported file type/);
    });

    it('should throw for file without extension', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'noextension',
      } as Express.Multer.File;

      jest
        .spyOn(typeDetectorService, 'detectType')
        .mockRejectedValue(new BadRequestException('Unsupported file type'));

      await expect(service.validateFileType(file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata for valid PDF file', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'test-document.pdf',
        size: 1024,
      } as Express.Multer.File;

      const mockDetectionResult = {
        mimeType: ALLOWED_DOCUMENT_TYPES.PDF,
        extension: '.pdf',
        parserType: ParserType.PDF_PARSER,
        detectionMethod: 'MAGIC_BYTES' as const,
        isSupported: true,
      };

      jest.spyOn(typeDetectorService, 'detectType').mockResolvedValue(mockDetectionResult);

      const metadata = await service.extractMetadata(file);

      expect(metadata).toHaveProperty('id');
      expect(metadata.originalName).toBe('test-document.pdf');
      expect(metadata.size).toBe(1024);
      expect(metadata.mimeType).toBe(ALLOWED_DOCUMENT_TYPES.PDF);
      expect(metadata.extension).toBe('.pdf');
      expect(metadata.parserType).toBe(ParserType.PDF_PARSER);
      expect(metadata.detectionMethod).toBe('MAGIC_BYTES');
      expect(metadata.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      ); // UUID format
    });

    it('should throw for oversized file', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'large.pdf',
        size: MAX_FILE_SIZE + 1,
      } as Express.Multer.File;

      await expect(service.extractMetadata(file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateBatch', () => {
    it('should pass for valid batch size', () => {
      const files = Array(10).fill({}) as Express.Multer.File[];

      expect(() => service.validateBatch(files)).not.toThrow();
    });

    it('should throw for batch exceeding max files', () => {
      const files = Array(MAX_BATCH_FILES + 1).fill({}) as Express.Multer.File[];

      expect(() => service.validateBatch(files)).toThrow(BadRequestException);
      expect(() => service.validateBatch(files)).toThrow(/Batch upload exceeds maximum/);
    });

    it('should throw for empty batch', () => {
      const files: Express.Multer.File[] = [];

      expect(() => service.validateBatch(files)).toThrow(BadRequestException);
      expect(() => service.validateBatch(files)).toThrow(/No files provided/);
    });
  });

  describe('extractBatchMetadata', () => {
    it('should extract metadata for multiple files', async () => {
      const files = [
        {
          buffer: Buffer.from([]),
          originalname: 'file1.pdf',
          size: 1024,
        },
        {
          buffer: Buffer.from([]),
          originalname: 'file2.pdf',
          size: 2048,
        },
      ] as Express.Multer.File[];

      const mockDetectionResult = {
        mimeType: ALLOWED_DOCUMENT_TYPES.PDF,
        extension: '.pdf',
        parserType: ParserType.PDF_PARSER,
        detectionMethod: 'MAGIC_BYTES' as const,
        isSupported: true,
      };

      jest.spyOn(typeDetectorService, 'detectType').mockResolvedValue(mockDetectionResult);

      const metadataList = await service.extractBatchMetadata(files);

      expect(metadataList).toHaveLength(2);
      expect(metadataList[0].originalName).toBe('file1.pdf');
      expect(metadataList[1].originalName).toBe('file2.pdf');
      expect(metadataList[0].size).toBe(1024);
      expect(metadataList[1].size).toBe(2048);
    });

    it('should throw for invalid batch', async () => {
      const files: Express.Multer.File[] = [];

      await expect(service.extractBatchMetadata(files)).rejects.toThrow(BadRequestException);
    });
  });
});
