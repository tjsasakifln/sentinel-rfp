import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrismaQueryRaw: jest.Mock;

  beforeEach(async () => {
    mockPrismaQueryRaw = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);

    // Mock the Prisma client
    (controller as any).prisma = {
      $queryRaw: mockPrismaQueryRaw,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status when database is up', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
      expect(result.checks.database.status).toBe('up');
      expect(typeof result.checks.database.responseTime).toBe('number');
      expect(typeof result.uptime).toBe('number');
    });

    it('should return current timestamp', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const before = new Date();
      const result = await controller.check();
      const after = new Date();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw 503 when database is down', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('Connection failed'));

      await expect(controller.check()).rejects.toThrow(HttpException);
      await expect(controller.check()).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.SERVICE_UNAVAILABLE,
        }),
      );
    });

    it('should include database response time', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();

      expect(result.checks.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.checks.database.responseTime).toBe('number');
    });

    it('should mark overall status as unhealthy when database is down', async () => {
      mockPrismaQueryRaw.mockRejectedValue(new Error('Connection failed'));

      try {
        await controller.check();
        fail('Should have thrown an exception');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const response = (error as HttpException).getResponse() as any;
        expect(response.status).toBe('unhealthy');
        expect(response.checks.database.status).toBe('down');
      }
    });

    it('should include environment in response', async () => {
      mockPrismaQueryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const result = await controller.check();

      expect(result.environment).toBe('test');

      process.env.NODE_ENV = originalEnv;
    });

    it('should measure actual response time', async () => {
      // Simulate slow database
      mockPrismaQueryRaw.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ '?column?': 1 }]), 50)),
      );

      const result = await controller.check();

      // Response time should be at least 50ms
      expect(result.checks.database.responseTime).toBeGreaterThanOrEqual(50);
    });
  });
});
