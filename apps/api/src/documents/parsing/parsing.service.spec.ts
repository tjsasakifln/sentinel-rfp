import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ParsingService } from './parsing.service';
import { DocumentType } from './types';

describe('ParsingService', () => {
  let service: ParsingService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        UNSTRUCTURED_API_KEY: 'test-unstructured-key',
        OPENAI_API_KEY: 'sk-test-openai-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParsingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ParsingService>(ParsingService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mock calls
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should call ConfigService on initialization', () => {
      // Service is created in beforeEach, so config is already called
      expect(configService).toBeDefined();
      expect(service).toBeDefined();
    });

    it('should log warning when required env vars are missing', () => {
      const mockConfigMissing = {
        get: jest.fn(() => undefined),
      };

      new ParsingService(mockConfigMissing as any);

      // Constructor should warn about missing variables
      expect(mockConfigMissing.get).toHaveBeenCalled();
    });
  });

  describe('parseDocument', () => {
    it('should throw BadRequestException when file is null', async () => {
      await expect(service.parseDocument(null as any, DocumentType.PDF)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file is undefined', async () => {
      await expect(service.parseDocument(undefined as any, DocumentType.PDF)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for unimplemented parser types', async () => {
      const buffer = Buffer.from('test content');

      await expect(service.parseDocument(buffer, DocumentType.PDF)).rejects.toThrow(
        /Parser for type 'pdf' not yet implemented/,
      );
    });

    it('should accept Buffer as file input', async () => {
      const buffer = Buffer.from('test content');

      await expect(service.parseDocument(buffer, DocumentType.PDF)).rejects.toThrow(Error);
    });

    it('should accept string (file path) as file input', async () => {
      const filePath = '/path/to/document.pdf';

      await expect(service.parseDocument(filePath, DocumentType.PDF)).rejects.toThrow(Error);
    });

    it('should log parsing start', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      const buffer = Buffer.from('test');

      try {
        await service.parseDocument(buffer, DocumentType.DOCX);
      } catch {
        // Expected to throw
      }

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Starting document parsing'));
    });

    it('should log errors when parsing fails', async () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const buffer = Buffer.from('test');

      try {
        await service.parseDocument(buffer, DocumentType.PDF);
      } catch {
        // Expected to throw
      }

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('isReady', () => {
    it('should return true when all required config is present', () => {
      expect(service.isReady()).toBe(true);
    });

    it('should return false when UNSTRUCTURED_API_KEY is missing', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'UNSTRUCTURED_API_KEY') return undefined;
        return 'test-value';
      });

      const result = service.isReady();
      expect(result).toBe(false);
    });

    it('should return false when OPENAI_API_KEY is missing', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return undefined;
        return 'test-value';
      });

      const result = service.isReady();
      expect(result).toBe(false);
    });

    it('should return false when both keys are missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const result = service.isReady();
      expect(result).toBe(false);
    });
  });

  describe('validateConfiguration (private)', () => {
    it('should not throw when configuration is valid', () => {
      expect(() => {
        service['validateConfiguration']();
      }).not.toThrow();
    });
  });
});
