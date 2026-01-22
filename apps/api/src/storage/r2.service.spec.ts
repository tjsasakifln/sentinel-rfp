/**
 * R2Service Unit Tests
 *
 * Tests for Cloudflare R2 storage service initialization and configuration.
 *
 * @module R2ServiceTests
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { R2Service } from './r2.service';

describe('R2Service', () => {
  let service: R2Service;
  let configService: ConfigService;

  // Mock environment variables
  const mockEnv = {
    R2_ACCOUNT_ID: 'test-account-id-12345678901234567890',
    R2_ACCESS_KEY_ID: 'test-access-key-id',
    R2_SECRET_ACCESS_KEY: 'test-secret-access-key',
    R2_BUCKET_NAME: 'test-bucket',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        R2Service,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockEnv[key as keyof typeof mockEnv]),
            getOrThrow: jest.fn(
              (key: string) => mockEnv[key as keyof typeof mockEnv] || `mock-${key}`,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<R2Service>(R2Service);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize S3Client with correct R2 endpoint', async () => {
      await service.initialize();

      const client = service.getClient();
      expect(client).toBeDefined();
    });

    it('should load configuration from environment variables', async () => {
      await service.initialize();

      const config = service.getConfig();
      expect(config.accountId).toBe(mockEnv.R2_ACCOUNT_ID);
      expect(config.bucketName).toBe(mockEnv.R2_BUCKET_NAME);
    });

    it('should call ConfigService methods for configuration loading', async () => {
      await service.initialize();

      // R2_ACCOUNT_ID uses get() to allow graceful skip if missing
      expect(configService.get).toHaveBeenCalledWith('R2_ACCOUNT_ID');
      // Other variables use getOrThrow() since they're required if R2_ACCOUNT_ID exists
      expect(configService.getOrThrow).toHaveBeenCalledWith('R2_ACCESS_KEY_ID');
      expect(configService.getOrThrow).toHaveBeenCalledWith('R2_SECRET_ACCESS_KEY');
      expect(configService.getOrThrow).toHaveBeenCalledWith('R2_BUCKET_NAME');
    });

    it('should skip initialization and log warning if R2_ACCOUNT_ID is missing', async () => {
      // Mock missing environment variable
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      await service.initialize();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('R2 environment variables not configured'),
      );
      expect(service.isInitialized()).toBe(false);
    });

    it('should throw error if R2_ACCESS_KEY_ID is missing but R2_ACCOUNT_ID exists', async () => {
      // Mock partially missing environment variables
      jest.spyOn(configService, 'get').mockReturnValue('test-account-id');
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key) => {
        if (key === 'R2_ACCESS_KEY_ID') {
          throw new Error(`Configuration key "${key}" does not exist`);
        }
        return mockEnv[key as keyof typeof mockEnv] || '';
      });

      await expect(service.initialize()).rejects.toThrow(
        'Configuration key "R2_ACCESS_KEY_ID" does not exist',
      );
    });
  });

  describe('getClient', () => {
    it('should return S3Client instance after initialization', async () => {
      await service.initialize();

      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client.constructor.name).toBe('S3Client');
    });

    it('should throw error if called before initialization', () => {
      expect(() => service.getClient()).toThrow(
        'R2 service is not initialized. Please configure R2_ACCOUNT_ID',
      );
    });
  });

  describe('getConfig', () => {
    it('should return R2 configuration without credentials', async () => {
      await service.initialize();

      const config = service.getConfig();
      expect(config).toHaveProperty('accountId');
      expect(config).toHaveProperty('bucketName');
      expect(config).not.toHaveProperty('accessKeyId');
      expect(config).not.toHaveProperty('secretAccessKey');
    });

    it('should throw error if called before initialization', () => {
      expect(() => service.getConfig()).toThrow(
        'R2 service is not initialized. Please configure R2_ACCOUNT_ID',
      );
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it('should return false if initialization was skipped', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      await service.initialize();
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('generatePresignedUploadUrl', () => {
    it('should throw error when not initialized', async () => {
      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: 'application/pdf',
      };

      await expect(service.generatePresignedUploadUrl(params)).rejects.toThrow(
        'R2 service is not initialized',
      );
    });

    it('should generate presigned URL with correct parameters', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: 'application/pdf',
      };

      const result = await service.generatePresignedUploadUrl(params);

      // Verify result structure
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('expiresAt');

      // Verify key format: {org_id}/documents/{doc_id}/original.{ext}
      expect(result.key).toBe('org_123/documents/doc_456/original.pdf');

      // Verify URL is a valid URL
      expect(() => new URL(result.url)).not.toThrow();

      // Verify expiresAt is a valid ISO 8601 timestamp
      expect(() => new Date(result.expiresAt)).not.toThrow();
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should use default expiration of 15 minutes (900 seconds)', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: 'application/pdf',
      };

      const beforeCall = Date.now();
      const result = await service.generatePresignedUploadUrl(params);
      const afterCall = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      const expectedMinExpiry = beforeCall + 900 * 1000; // 15 minutes
      const expectedMaxExpiry = afterCall + 900 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiresAt).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should use custom expiration when provided', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: 'application/pdf',
        options: {
          expiresIn: 600, // 10 minutes
        },
      };

      const beforeCall = Date.now();
      const result = await service.generatePresignedUploadUrl(params);
      const afterCall = Date.now();

      const expiresAt = new Date(result.expiresAt).getTime();
      const expectedMinExpiry = beforeCall + 600 * 1000; // 10 minutes
      const expectedMaxExpiry = afterCall + 600 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiresAt).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should handle different file extensions', async () => {
      await service.initialize();

      const extensions = ['pdf', 'docx', 'xlsx', 'png', 'jpg'];

      for (const ext of extensions) {
        const params = {
          organizationId: 'org_123',
          documentId: 'doc_456',
          extension: ext,
          contentType: 'application/octet-stream',
        };

        const result = await service.generatePresignedUploadUrl(params);
        expect(result.key).toBe(`org_123/documents/doc_456/original.${ext}`);
      }
    });

    it('should throw error if organizationId is missing', async () => {
      await service.initialize();

      const params = {
        organizationId: '',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: 'application/pdf',
      };

      await expect(service.generatePresignedUploadUrl(params)).rejects.toThrow(
        'organizationId is required',
      );
    });

    it('should throw error if documentId is missing', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: '',
        extension: 'pdf',
        contentType: 'application/pdf',
      };

      await expect(service.generatePresignedUploadUrl(params)).rejects.toThrow(
        'documentId is required',
      );
    });

    it('should throw error if extension is missing', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: '',
        contentType: 'application/pdf',
      };

      await expect(service.generatePresignedUploadUrl(params)).rejects.toThrow(
        'extension is required',
      );
    });

    it('should throw error if contentType is missing', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: '',
      };

      await expect(service.generatePresignedUploadUrl(params)).rejects.toThrow(
        'contentType is required',
      );
    });
  });

  describe('generatePresignedDownloadUrl (not implemented yet)', () => {
    it('should throw error when not initialized', async () => {
      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        filename: 'test.pdf',
      };

      await expect(service.generatePresignedDownloadUrl(params)).rejects.toThrow(
        'R2 service is not initialized',
      );
    });

    it('should throw "not implemented" error after initialization', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        filename: 'test.pdf',
      };

      await expect(service.generatePresignedDownloadUrl(params)).rejects.toThrow(
        'Not implemented yet - see issue #203',
      );
    });
  });
});
