/**
 * Role-Permissions Map Tests
 *
 * Tests for role-to-permissions mapping and permission check utilities.
 *
 * @module RolePermissionsMapTests
 */

import { UserRole } from '@prisma/client';

import { Permission } from './permissions.enum';
import {
  RolePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from './role-permissions.map';

describe('RolePermissions Map', () => {
  describe('RolePermissions constant', () => {
    it('should define permissions for all roles', () => {
      expect(RolePermissions[UserRole.OWNER]).toBeDefined();
      expect(RolePermissions[UserRole.ADMIN]).toBeDefined();
      expect(RolePermissions[UserRole.MEMBER]).toBeDefined();
      expect(RolePermissions[UserRole.SME]).toBeDefined();
      expect(RolePermissions[UserRole.VIEWER]).toBeDefined();
    });

    it('OWNER should have all permissions', () => {
      const ownerPerms = RolePermissions[UserRole.OWNER];

      // Check critical permissions
      expect(ownerPerms).toContain(Permission.ORG_DELETE);
      expect(ownerPerms).toContain(Permission.USER_MANAGE);
      expect(ownerPerms).toContain(Permission.PROPOSAL_MANAGE);
      expect(ownerPerms).toContain(Permission.LIBRARY_MANAGE);
      expect(ownerPerms).toContain(Permission.DOCUMENT_MANAGE);
    });

    it('ADMIN should have user management but not org deletion', () => {
      const adminPerms = RolePermissions[UserRole.ADMIN];

      expect(adminPerms).toContain(Permission.USER_MANAGE);
      expect(adminPerms).toContain(Permission.ORG_UPDATE);
      expect(adminPerms).not.toContain(Permission.ORG_DELETE);
    });

    it('MEMBER should have proposal/library create but not delete', () => {
      const memberPerms = RolePermissions[UserRole.MEMBER];

      expect(memberPerms).toContain(Permission.PROPOSAL_CREATE);
      expect(memberPerms).toContain(Permission.LIBRARY_CREATE);
      expect(memberPerms).not.toContain(Permission.PROPOSAL_DELETE);
      expect(memberPerms).not.toContain(Permission.USER_MANAGE);
    });

    it('SME should have read-only access plus SME_RESPOND', () => {
      const smePerms = RolePermissions[UserRole.SME];

      expect(smePerms).toContain(Permission.PROPOSAL_READ);
      expect(smePerms).toContain(Permission.LIBRARY_READ);
      expect(smePerms).toContain(Permission.SME_RESPOND);
      expect(smePerms).not.toContain(Permission.PROPOSAL_CREATE);
      expect(smePerms).not.toContain(Permission.USER_MANAGE);
    });

    it('VIEWER should have read-only permissions', () => {
      const viewerPerms = RolePermissions[UserRole.VIEWER];

      expect(viewerPerms).toContain(Permission.PROPOSAL_READ);
      expect(viewerPerms).toContain(Permission.LIBRARY_READ);
      expect(viewerPerms).toContain(Permission.DOCUMENT_READ);
      expect(viewerPerms).not.toContain(Permission.PROPOSAL_CREATE);
      expect(viewerPerms).not.toContain(Permission.USER_CREATE);
      expect(viewerPerms).not.toContain(Permission.SME_RESPOND);
    });
  });

  describe('hasPermission utility', () => {
    it('should return true if role has permission', () => {
      expect(hasPermission(UserRole.OWNER, Permission.ORG_DELETE)).toBe(true);
      expect(hasPermission(UserRole.ADMIN, Permission.USER_CREATE)).toBe(true);
      expect(hasPermission(UserRole.MEMBER, Permission.PROPOSAL_CREATE)).toBe(true);
      expect(hasPermission(UserRole.SME, Permission.SME_RESPOND)).toBe(true);
      expect(hasPermission(UserRole.VIEWER, Permission.PROPOSAL_READ)).toBe(true);
    });

    it('should return false if role does not have permission', () => {
      expect(hasPermission(UserRole.VIEWER, Permission.PROPOSAL_CREATE)).toBe(false);
      expect(hasPermission(UserRole.MEMBER, Permission.USER_MANAGE)).toBe(false);
      expect(hasPermission(UserRole.SME, Permission.PROPOSAL_DELETE)).toBe(false);
      expect(hasPermission(UserRole.ADMIN, Permission.ORG_DELETE)).toBe(false);
    });

    it('should handle invalid roles gracefully', () => {
      expect(hasPermission('INVALID_ROLE' as UserRole, Permission.PROPOSAL_READ)).toBe(false);
    });
  });

  describe('hasAllPermissions utility', () => {
    it('should return true if role has all specified permissions', () => {
      expect(
        hasAllPermissions(UserRole.OWNER, [
          Permission.PROPOSAL_CREATE,
          Permission.USER_MANAGE,
          Permission.ORG_DELETE,
        ]),
      ).toBe(true);

      expect(
        hasAllPermissions(UserRole.ADMIN, [Permission.USER_CREATE, Permission.PROPOSAL_UPDATE]),
      ).toBe(true);

      expect(
        hasAllPermissions(UserRole.MEMBER, [Permission.PROPOSAL_CREATE, Permission.LIBRARY_READ]),
      ).toBe(true);
    });

    it('should return false if role is missing any permission', () => {
      expect(
        hasAllPermissions(UserRole.ADMIN, [Permission.USER_MANAGE, Permission.ORG_DELETE]),
      ).toBe(false); // Missing ORG_DELETE

      expect(
        hasAllPermissions(UserRole.MEMBER, [Permission.PROPOSAL_CREATE, Permission.USER_MANAGE]),
      ).toBe(false); // Missing USER_MANAGE

      expect(
        hasAllPermissions(UserRole.VIEWER, [Permission.PROPOSAL_READ, Permission.PROPOSAL_CREATE]),
      ).toBe(false); // Missing CREATE
    });

    it('should return true for empty permissions array', () => {
      expect(hasAllPermissions(UserRole.VIEWER, [])).toBe(true);
    });

    it('should handle invalid roles gracefully', () => {
      expect(hasAllPermissions('INVALID_ROLE' as UserRole, [Permission.PROPOSAL_READ])).toBe(false);
    });
  });

  describe('hasAnyPermission utility', () => {
    it('should return true if role has at least one permission', () => {
      expect(
        hasAnyPermission(UserRole.VIEWER, [Permission.PROPOSAL_CREATE, Permission.PROPOSAL_READ]),
      ).toBe(true); // Has READ

      expect(
        hasAnyPermission(UserRole.MEMBER, [Permission.USER_MANAGE, Permission.PROPOSAL_CREATE]),
      ).toBe(true); // Has PROPOSAL_CREATE

      expect(
        hasAnyPermission(UserRole.ADMIN, [Permission.USER_DELETE, Permission.ORG_DELETE]),
      ).toBe(true); // Has USER_DELETE
    });

    it('should return false if role has none of the permissions', () => {
      expect(
        hasAnyPermission(UserRole.VIEWER, [Permission.PROPOSAL_CREATE, Permission.USER_MANAGE]),
      ).toBe(false);

      expect(
        hasAnyPermission(UserRole.MEMBER, [Permission.USER_MANAGE, Permission.ORG_DELETE]),
      ).toBe(false);

      expect(
        hasAnyPermission(UserRole.SME, [Permission.PROPOSAL_CREATE, Permission.USER_DELETE]),
      ).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      expect(hasAnyPermission(UserRole.OWNER, [])).toBe(false);
    });

    it('should handle invalid roles gracefully', () => {
      expect(hasAnyPermission('INVALID_ROLE' as UserRole, [Permission.PROPOSAL_READ])).toBe(false);
    });
  });

  describe('Permission hierarchy validation', () => {
    it('OWNER should have more permissions than ADMIN', () => {
      expect(RolePermissions[UserRole.OWNER].length).toBeGreaterThan(
        RolePermissions[UserRole.ADMIN].length,
      );
    });

    it('ADMIN should have more permissions than MEMBER', () => {
      expect(RolePermissions[UserRole.ADMIN].length).toBeGreaterThan(
        RolePermissions[UserRole.MEMBER].length,
      );
    });

    it('MEMBER should have more permissions than VIEWER', () => {
      expect(RolePermissions[UserRole.MEMBER].length).toBeGreaterThan(
        RolePermissions[UserRole.VIEWER].length,
      );
    });

    it('VIEWER should have only read permissions', () => {
      const viewerPerms = RolePermissions[UserRole.VIEWER];
      const readOnlyPerms = viewerPerms.filter((p) => p.endsWith(':read'));

      // All viewer permissions should be read-only
      expect(readOnlyPerms.length).toBe(viewerPerms.length);
    });
  });

  describe('SME role specifics', () => {
    it('SME should have unique SME_RESPOND permission', () => {
      expect(RolePermissions[UserRole.SME]).toContain(Permission.SME_RESPOND);
    });

    it('SME should not have write permissions', () => {
      const smePerms = RolePermissions[UserRole.SME];

      expect(smePerms).not.toContain(Permission.PROPOSAL_CREATE);
      expect(smePerms).not.toContain(Permission.LIBRARY_CREATE);
      expect(smePerms).not.toContain(Permission.DOCUMENT_UPLOAD);
      expect(smePerms).not.toContain(Permission.USER_CREATE);
    });
  });
});
