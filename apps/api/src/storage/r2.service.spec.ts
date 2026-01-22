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

  describe('presigned URLs (not implemented yet)', () => {
    it('should throw error for generatePresignedUploadUrl when not initialized', async () => {
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

    it('should throw "not implemented" error for generatePresignedUploadUrl after initialization', async () => {
      await service.initialize();

      const params = {
        organizationId: 'org_123',
        documentId: 'doc_456',
        extension: 'pdf',
        contentType: 'application/pdf',
      };

      await expect(service.generatePresignedUploadUrl(params)).rejects.toThrow(
        'Not implemented yet - see issue #202',
      );
    });

    it('should throw error for generatePresignedDownloadUrl when not initialized', async () => {
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

    it('should throw "not implemented" error for generatePresignedDownloadUrl after initialization', async () => {
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
