/**
 * TenantGuard Unit Tests
 *
 * Tests for tenant guard that extracts organizationId from JWT.
 */

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TenantContext } from './tenant.context';
import { TenantGuard, SKIP_TENANT_KEY } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let tenantContext: TenantContext;
  let reflector: Reflector;

  beforeEach(() => {
    tenantContext = new TenantContext();
    reflector = new Reflector();
    guard = new TenantGuard(tenantContext, reflector);
  });

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('successful tenant extraction', () => {
    it('should extract organizationId from authenticated user', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        organizationId: 'org-123',
        role: 'MEMBER',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantContext.organizationId).toBe('org-123');
      expect(tenantContext.isInitialized).toBe(true);
    });

    it('should work with different organization IDs', () => {
      const mockUser = {
        id: 'user-456',
        email: 'another@example.com',
        organizationId: 'org-xyz',
        role: 'ADMIN',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);
      guard.canActivate(context);

      expect(tenantContext.organizationId).toBe('org-xyz');
    });
  });

  describe('skip tenant decorator', () => {
    it('should skip tenant extraction when @SkipTenant() is applied', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = createMockExecutionContext(undefined);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantContext.isInitialized).toBe(false);
    });

    it('should check both handler and class metadata', () => {
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = createMockExecutionContext(undefined);
      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith(SKIP_TENANT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('error handling - missing user', () => {
    it('should throw UnauthorizedException when user is undefined', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(/User not authenticated.*JwtAuthGuard/);
    });

    it('should throw UnauthorizedException when user is null', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(null);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('error handling - missing organizationId', () => {
    it('should throw UnauthorizedException when organizationId is missing', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'MEMBER',
        // organizationId missing
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        /Organization ID not found.*invalid or outdated/,
      );
    });

    it('should throw UnauthorizedException when organizationId is null', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        organizationId: null,
        role: 'MEMBER',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when organizationId is empty string', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        organizationId: '',
        role: 'MEMBER',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('error handling - tenant context initialization', () => {
    it('should handle TenantContext initialization errors', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        organizationId: 'org-123',
        role: 'MEMBER',
      };

      // Pre-initialize tenant context to trigger immutability error
      tenantContext.organizationId = 'org-999';

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(/Failed to initialize tenant context/);
    });
  });

  describe('request scope isolation', () => {
    it('should work with multiple requests (simulated)', () => {
      const guard1 = new TenantGuard(new TenantContext(), reflector);
      const guard2 = new TenantGuard(new TenantContext(), reflector);

      const user1 = {
        id: 'user-1',
        email: 'user1@example.com',
        organizationId: 'org-1',
        role: 'MEMBER',
      };
      const user2 = {
        id: 'user-2',
        email: 'user2@example.com',
        organizationId: 'org-2',
        role: 'MEMBER',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context1 = createMockExecutionContext(user1);
      const context2 = createMockExecutionContext(user2);

      guard1.canActivate(context1);
      guard2.canActivate(context2);

      // Each guard should have its own context
      // (In real app, this is handled by NestJS request scope)
    });
  });

  describe('edge cases', () => {
    it('should handle user object with extra properties', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        organizationId: 'org-123',
        role: 'MEMBER',
        extraProp: 'should be ignored',
        anotherProp: 123,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantContext.organizationId).toBe('org-123');
    });

    it('should handle organizationId with special characters', () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        organizationId: 'org-with-dashes-123-abc',
        role: 'MEMBER',
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext(mockUser);
      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(tenantContext.organizationId).toBe('org-with-dashes-123-abc');
    });
  });
});
