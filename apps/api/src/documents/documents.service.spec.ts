import { Test, TestingModule } from '@nestjs/testing';

import { ParserType } from './detection/mime-types';
import { TypeDetectorService } from './detection/type-detector.service';
import { DocumentsService } from './documents.service';
import { UploadService } from './upload/upload.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let typeDetectorService: TypeDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        UploadService,
        {
          provide: TypeDetectorService,
          useValue: {
            detectType: jest.fn().mockResolvedValue({
              mimeType: 'application/pdf',
              extension: '.pdf',
              parserType: ParserType.PDF_PARSER,
              detectionMethod: 'MAGIC_BYTES',
              isSupported: true,
            }),
            isSupportedMimeType: jest.fn().mockReturnValue(true),
            isSupportedExtension: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    typeDetectorService = module.get<TypeDetectorService>(TypeDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'test.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      } as Express.Multer.File;

      const dto = {
        name: 'My Test Document',
        description: 'A test document for upload',
      };

      const result = await service.uploadDocument(file, dto);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('My Test Document');
      expect(result.originalName).toBe('test.pdf');
      expect(result.size).toBe(1024);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.status).toBe('pending');
      expect(result.uploadedAt).toBeInstanceOf(Date);
    });

    it('should use original filename when no custom name provided', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'original-name.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      } as Express.Multer.File;

      const result = await service.uploadDocument(file, {});

      expect(result.name).toBe('original-name.pdf');
    });

    it('should throw error for invalid file', async () => {
      const file = {
        buffer: Buffer.from([]),
        originalname: 'image.jpg',
        size: 1024,
        mimetype: 'image/jpeg',
        fieldname: 'file',
        encoding: '7bit',
        stream: {} as any,
        destination: '',
        filename: '',
        path: '',
      } as Express.Multer.File;

      // Mock TypeDetectorService to reject unsupported file type
      jest
        .spyOn(typeDetectorService, 'detectType')
        .mockRejectedValueOnce(new Error('Unsupported file type: image/jpeg'));

      await expect(service.uploadDocument(file, {})).rejects.toThrow();
    });
  });

  describe('uploadBatch', () => {
    it('should upload multiple documents successfully', async () => {
      const files: Express.Multer.File[] = [
        {
          buffer: Buffer.from([]),
          originalname: 'file1.pdf',
          size: 1024,
          mimetype: 'application/pdf',
          fieldname: 'files',
          encoding: '7bit',
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
        {
          buffer: Buffer.from([]),
          originalname: 'file2.pdf',
          size: 2048,
          mimetype: 'application/pdf',
          fieldname: 'files',
          encoding: '7bit',
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
      ];

      const dto = {
        batchPrefix: 'TEST',
      };

      const result = await service.uploadBatch(files, dto);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0].name).toBe('TEST-file1.pdf');
      expect(result.documents[1].name).toBe('TEST-file2.pdf');
    });

    it('should handle partial failures in batch upload', async () => {
      const files: Express.Multer.File[] = [
        {
          buffer: Buffer.from([]),
          originalname: 'valid.pdf',
          size: 1024,
          mimetype: 'application/pdf',
          fieldname: 'files',
          encoding: '7bit',
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
        {
          buffer: Buffer.from([]),
          originalname: 'invalid.jpg',
          size: 1024,
          mimetype: 'image/jpeg',
          fieldname: 'files',
          encoding: '7bit',
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
      ];

      // Mock TypeDetectorService to succeed for PDF and fail for JPG
      jest
        .spyOn(typeDetectorService, 'detectType')
        .mockResolvedValueOnce({
          mimeType: 'application/pdf',
          extension: '.pdf',
          parserType: ParserType.PDF_PARSER,
          detectionMethod: 'MAGIC_BYTES',
          isSupported: true,
        })
        .mockRejectedValueOnce(new Error('Unsupported file type: image/jpeg'));

      const result = await service.uploadBatch(files, {});

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].originalName).toBe('valid.pdf');
    });

    it('should throw error for empty batch', async () => {
      const files: Express.Multer.File[] = [];

      await expect(service.uploadBatch(files, {})).rejects.toThrow();
    });

    it('should use original filenames when no batch prefix', async () => {
      const files: Express.Multer.File[] = [
        {
          buffer: Buffer.from([]),
          originalname: 'original.pdf',
          size: 1024,
          mimetype: 'application/pdf',
          fieldname: 'files',
          encoding: '7bit',
          stream: {} as any,
          destination: '',
          filename: '',
          path: '',
        },
      ];

      const result = await service.uploadBatch(files, {});

      expect(result.documents[0].name).toBe('original.pdf');
    });
  });
});
