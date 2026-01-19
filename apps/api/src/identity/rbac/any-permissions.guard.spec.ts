/**
 * AnyPermissionsGuard Tests
 *
 * Tests for OR-logic permission-based access control guard.
 *
 * @module AnyPermissionsGuardTests
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { AnyPermissionsGuard, ANY_PERMISSIONS_KEY } from './any-permissions.guard';
import { Permission } from './permissions.enum';

describe('AnyPermissionsGuard', () => {
  let guard: AnyPermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new AnyPermissionsGuard(reflector);
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

    it('should allow access if user has at least one required permission', () => {
      const context = createMockExecutionContext({ role: UserRole.MEMBER }, [
        Permission.USER_MANAGE, // MEMBER doesn't have this
        Permission.PROPOSAL_CREATE, // MEMBER HAS this
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if user has none of the required permissions', () => {
      const context = createMockExecutionContext({ role: UserRole.VIEWER }, [
        Permission.PROPOSAL_CREATE,
        Permission.USER_MANAGE,
        Permission.ORG_DELETE,
      ]);

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should allow access if user has ALL required permissions (superset case)', () => {
      const context = createMockExecutionContext({ role: UserRole.OWNER }, [
        Permission.PROPOSAL_CREATE,
        Permission.USER_MANAGE,
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should work for ADMIN role with mixed permissions', () => {
      const context = createMockExecutionContext({ role: UserRole.ADMIN }, [
        Permission.ORG_DELETE, // ADMIN doesn't have this
        Permission.USER_CREATE, // ADMIN HAS this
      ]);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should work for SME role', () => {
      const contextAllow = createMockExecutionContext({ role: UserRole.SME }, [
        Permission.PROPOSAL_CREATE, // SME doesn't have this
        Permission.SME_RESPOND, // SME HAS this
      ]);
      expect(guard.canActivate(contextAllow)).toBe(true);

      const contextDeny = createMockExecutionContext({ role: UserRole.SME }, [
        Permission.PROPOSAL_CREATE,
        Permission.USER_MANAGE,
      ]);
      expect(guard.canActivate(contextDeny)).toBe(false);
    });

    it('should work for VIEWER role (read-only)', () => {
      const contextAllow = createMockExecutionContext({ role: UserRole.VIEWER }, [
        Permission.PROPOSAL_CREATE, // VIEWER doesn't have this
        Permission.PROPOSAL_READ, // VIEWER HAS this
      ]);
      expect(guard.canActivate(contextAllow)).toBe(true);

      const contextDeny = createMockExecutionContext({ role: UserRole.VIEWER }, [
        Permission.PROPOSAL_CREATE,
        Permission.USER_MANAGE,
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

      expect(spy).toHaveBeenCalledWith(ANY_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });

  describe('OR logic validation', () => {
    it('should use OR logic (different from PermissionsGuard AND logic)', () => {
      const context = createMockExecutionContext({ role: UserRole.MEMBER }, [
        Permission.USER_MANAGE, // MEMBER lacks this
        Permission.PROPOSAL_CREATE, // MEMBER has this
      ]);

      // AnyPermissionsGuard should allow (OR logic)
      expect(guard.canActivate(context)).toBe(true);

      // Note: PermissionsGuard would deny (AND logic) - tested separately
    });

    it('should require at least one permission match', () => {
      const context = createMockExecutionContext({ role: UserRole.MEMBER }, [
        Permission.USER_MANAGE,
        Permission.ORG_DELETE,
        Permission.INTEGRATION_MANAGE,
      ]);

      // MEMBER has none of these permissions
      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
