import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ParserType } from './mime-types';
import { TypeDetectorService } from './type-detector.service';

describe('TypeDetectorService', () => {
  let service: TypeDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypeDetectorService],
    }).compile();

    service = module.get<TypeDetectorService>(TypeDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectType', () => {
    it('should detect PDF file via magic bytes', async () => {
      // PDF magic bytes: %PDF-1.
      const pdfBuffer = Buffer.from('%PDF-1.4\n', 'utf-8');
      const filename = 'document.pdf';

      const result = await service.detectType(pdfBuffer, filename);

      expect(result.mimeType).toBe('application/pdf');
      expect(result.extension).toBe('.pdf');
      expect(result.parserType).toBe(ParserType.PDF_PARSER);
      expect(result.detectionMethod).toBe('MAGIC_BYTES');
      expect(result.isSupported).toBe(true);
    });

    it('should detect DOCX file via magic bytes', async () => {
      // DOCX is ZIP-based (PK header): 0x50 0x4B 0x03 0x04
      const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const filename = 'document.docx';

      const result = await service.detectType(docxBuffer, filename);

      // DOCX has zip magic bytes, so detection will fallback to extension
      expect(result.extension).toBe('.docx');
      expect(result.parserType).toBe(ParserType.DOCX_PARSER);
      expect(result.isSupported).toBe(true);
    });

    it('should fallback to extension detection when magic bytes fail', async () => {
      // Random bytes that don't match any magic signature
      const randomBuffer = Buffer.from('random content');
      const filename = 'document.xlsx';

      const result = await service.detectType(randomBuffer, filename);

      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.extension).toBe('.xlsx');
      expect(result.parserType).toBe(ParserType.XLSX_PARSER);
      expect(result.detectionMethod).toBe('EXTENSION_FALLBACK');
      expect(result.isSupported).toBe(true);
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = 'document.txt'; // .txt not supported

      await expect(service.detectType(randomBuffer, filename)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with helpful error message', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = 'image.jpg'; // .jpg not supported

      await expect(service.detectType(randomBuffer, filename)).rejects.toThrow(
        /Unsupported file type/,
      );
    });

    it('should handle files without extension', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = 'document_no_extension';

      await expect(service.detectType(randomBuffer, filename)).rejects.toThrow(BadRequestException);
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const filename = 'document.pdf';

      const result = await service.detectType(emptyBuffer, filename);

      // Should fallback to extension
      expect(result.detectionMethod).toBe('EXTENSION_FALLBACK');
      expect(result.parserType).toBe(ParserType.PDF_PARSER);
    });

    it('should normalize extension to lowercase', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = 'DOCUMENT.PDF'; // uppercase

      const result = await service.detectType(randomBuffer, filename);

      expect(result.extension).toBe('.pdf'); // normalized to lowercase
    });
  });

  describe('isSupportedMimeType', () => {
    it('should return true for PDF mime type', () => {
      expect(service.isSupportedMimeType('application/pdf')).toBe(true);
    });

    it('should return true for DOCX mime type', () => {
      expect(
        service.isSupportedMimeType(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ).toBe(true);
    });

    it('should return true for XLSX mime type', () => {
      expect(
        service.isSupportedMimeType(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).toBe(true);
    });

    it('should return true for PPTX mime type', () => {
      expect(
        service.isSupportedMimeType(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ),
      ).toBe(true);
    });

    it('should return false for unsupported mime type', () => {
      expect(service.isSupportedMimeType('text/plain')).toBe(false);
      expect(service.isSupportedMimeType('image/jpeg')).toBe(false);
    });
  });

  describe('isSupportedExtension', () => {
    it('should return true for .pdf extension', () => {
      expect(service.isSupportedExtension('.pdf')).toBe(true);
      expect(service.isSupportedExtension('pdf')).toBe(true); // without dot
      expect(service.isSupportedExtension('.PDF')).toBe(true); // uppercase
    });

    it('should return true for .docx extension', () => {
      expect(service.isSupportedExtension('.docx')).toBe(true);
      expect(service.isSupportedExtension('docx')).toBe(true);
    });

    it('should return true for .xlsx extension', () => {
      expect(service.isSupportedExtension('.xlsx')).toBe(true);
      expect(service.isSupportedExtension('xlsx')).toBe(true);
    });

    it('should return true for .pptx extension', () => {
      expect(service.isSupportedExtension('.pptx')).toBe(true);
      expect(service.isSupportedExtension('pptx')).toBe(true);
    });

    it('should return false for unsupported extension', () => {
      expect(service.isSupportedExtension('.txt')).toBe(false);
      expect(service.isSupportedExtension('.jpg')).toBe(false);
      expect(service.isSupportedExtension('doc')).toBe(false); // old .doc format
    });
  });

  describe('edge cases', () => {
    it('should handle multiple dots in filename', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = 'my.document.with.dots.pdf';

      const result = await service.detectType(randomBuffer, filename);

      expect(result.extension).toBe('.pdf');
      expect(result.parserType).toBe(ParserType.PDF_PARSER);
    });

    it('should handle filename with path', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = '/path/to/document.xlsx';

      const result = await service.detectType(randomBuffer, filename);

      expect(result.extension).toBe('.xlsx');
      expect(result.parserType).toBe(ParserType.XLSX_PARSER);
    });

    it('should handle special characters in filename', async () => {
      const randomBuffer = Buffer.from('random content');
      const filename = 'document (2024-01-22) [v2].pptx';

      const result = await service.detectType(randomBuffer, filename);

      expect(result.extension).toBe('.pptx');
      expect(result.parserType).toBe(ParserType.PPTX_PARSER);
    });
  });
});
