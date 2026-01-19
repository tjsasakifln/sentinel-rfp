/**
 * PermissionsGuard Tests
 *
 * Tests for permission-based access control guard.
 *
 * @module PermissionsGuardTests
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { Permission } from './permissions.enum';
import { PermissionsGuard, PERMISSIONS_KEY } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockExecutionContext = (
    user: { role?: UserRole; id?: string; email?: string } | null,
    permissions: Permission[] | null,
  ): ExecutionContext => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);

    return mockContext;
  };

  describe('canActivate', () => {
    it('should allow access if no permissions are required', () => {
      const context = createMockExecutionContext({ role: UserRole.VIEWER }, null);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if permissions array is empty', () => {
      const context = createMockExecutionContext({ role: UserRole.VIEWER }, []);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user is not authenticated', () => {
      const context = createMockExecutionContext(null, [Permission.PROPOSAL_READ]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access if user has no role', () => {
      const context = createMockExecutionContext({ id: '123', email: 'test@example.com' }, [
        Permission.PROPOSAL_READ,
      ]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access if user has required permission', () => {
      const context = createMockExecutionContext({ role: UserRole.MEMBER }, [
        Permission.PROPOSAL_CREATE,
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user lacks required permission', () => {
      const context = createMockExecutionContext({ role: UserRole.VIEWER }, [
        Permission.PROPOSAL_CREATE,
      ]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access if user has ALL required permissions', () => {
      const context = createMockExecutionContext({ role: UserRole.ADMIN }, [
        Permission.USER_CREATE,
        Permission.PROPOSAL_UPDATE,
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user lacks ANY required permission', () => {
      const context = createMockExecutionContext({ role: UserRole.MEMBER }, [
        Permission.PROPOSAL_CREATE,
        Permission.USER_MANAGE, // MEMBER doesn't have this
      ]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should work for OWNER role (has all permissions)', () => {
      const context = createMockExecutionContext({ role: UserRole.OWNER }, [
        Permission.ORG_DELETE,
        Permission.USER_MANAGE,
        Permission.PROPOSAL_MANAGE,
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should work for SME role', () => {
      const contextAllow = createMockExecutionContext({ role: UserRole.SME }, [
        Permission.SME_RESPOND,
      ]);
      expect(guard.canActivate(contextAllow)).toBe(true);

      const contextDeny = createMockExecutionContext({ role: UserRole.SME }, [
        Permission.PROPOSAL_CREATE,
      ]);
      expect(guard.canActivate(contextDeny)).toBe(false);
    });

    it('should work for VIEWER role (read-only)', () => {
      const contextAllow = createMockExecutionContext({ role: UserRole.VIEWER }, [
        Permission.PROPOSAL_READ,
        Permission.LIBRARY_READ,
      ]);
      expect(guard.canActivate(contextAllow)).toBe(true);

      const contextDeny = createMockExecutionContext({ role: UserRole.VIEWER }, [
        Permission.PROPOSAL_CREATE,
      ]);
      expect(guard.canActivate(contextDeny)).toBe(false);
    });
  });

  describe('reflector integration', () => {
    it('should check metadata from both handler and class', () => {
      const spy = jest.spyOn(reflector, 'getAllAndOverride');
      const context = createMockExecutionContext({ role: UserRole.ADMIN }, [
        Permission.USER_CREATE,
      ]);

      guard.canActivate(context);

      expect(spy).toHaveBeenCalledWith(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    });
  });
});
