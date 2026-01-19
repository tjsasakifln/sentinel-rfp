/**
 * Role to Permissions Mapping
 *
 * Defines which permissions each role has.
 * Used by RolesGuard and PermissionsGuard for authorization checks.
 *
 * @module RolePermissionsMap
 */

import { UserRole } from '@prisma/client';

import { Permission } from './permissions.enum';

/**
 * Role to Permissions mapping
 *
 * Each role has a specific set of permissions.
 * Higher roles inherit permissions from lower roles (implicit hierarchy).
 *
 * Hierarchy: OWNER > ADMIN > MEMBER > SME > VIEWER
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  /**
   * OWNER - Full access to everything
   *
   * Can manage billing, delete organization, and perform all actions.
   */
  [UserRole.OWNER]: [
    // Proposals
    Permission.PROPOSAL_MANAGE,
    Permission.PROPOSAL_CREATE,
    Permission.PROPOSAL_READ,
    Permission.PROPOSAL_UPDATE,
    Permission.PROPOSAL_DELETE,
    Permission.PROPOSAL_EXPORT,

    // Library
    Permission.LIBRARY_MANAGE,
    Permission.LIBRARY_CREATE,
    Permission.LIBRARY_READ,
    Permission.LIBRARY_UPDATE,
    Permission.LIBRARY_DELETE,

    // Documents
    Permission.DOCUMENT_MANAGE,
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_DELETE,

    // Users
    Permission.USER_MANAGE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,

    // Organization
    Permission.ORG_MANAGE,
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_DELETE,

    // Settings & Integrations
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.INTEGRATION_MANAGE,

    // SME
    Permission.SME_RESPOND,
  ],

  /**
   * ADMIN - User management, settings, integrations
   *
   * Cannot delete organization or manage billing.
   */
  [UserRole.ADMIN]: [
    // Proposals
    Permission.PROPOSAL_CREATE,
    Permission.PROPOSAL_READ,
    Permission.PROPOSAL_UPDATE,
    Permission.PROPOSAL_DELETE,
    Permission.PROPOSAL_EXPORT,

    // Library
    Permission.LIBRARY_CREATE,
    Permission.LIBRARY_READ,
    Permission.LIBRARY_UPDATE,
    Permission.LIBRARY_DELETE,

    // Documents
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_DELETE,

    // Users
    Permission.USER_MANAGE,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,

    // Organization (read/update, no delete)
    Permission.ORG_READ,
    Permission.ORG_UPDATE,

    // Settings & Integrations
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.INTEGRATION_MANAGE,

    // SME
    Permission.SME_RESPOND,
  ],

  /**
   * MEMBER - Create/edit proposals, manage library
   *
   * Cannot manage users or organization settings.
   */
  [UserRole.MEMBER]: [
    // Proposals
    Permission.PROPOSAL_CREATE,
    Permission.PROPOSAL_READ,
    Permission.PROPOSAL_UPDATE,
    Permission.PROPOSAL_EXPORT,

    // Library
    Permission.LIBRARY_CREATE,
    Permission.LIBRARY_READ,
    Permission.LIBRARY_UPDATE,

    // Documents
    Permission.DOCUMENT_UPLOAD,
    Permission.DOCUMENT_READ,

    // Users (read-only)
    Permission.USER_READ,

    // Organization (read-only)
    Permission.ORG_READ,

    // Settings (read-only)
    Permission.SETTINGS_READ,
  ],

  /**
   * SME - Subject Matter Expert
   *
   * Respond to requests via Slack/Teams, read-only access to proposals/library.
   */
  [UserRole.SME]: [
    // Proposals (read-only)
    Permission.PROPOSAL_READ,

    // Library (read-only)
    Permission.LIBRARY_READ,

    // Documents (read-only)
    Permission.DOCUMENT_READ,

    // Users (read-only)
    Permission.USER_READ,

    // Organization (read-only)
    Permission.ORG_READ,

    // SME-specific
    Permission.SME_RESPOND,
  ],

  /**
   * VIEWER - Read-only access
   *
   * Can view proposals, library, and documents but cannot modify anything.
   */
  [UserRole.VIEWER]: [
    // Proposals (read-only)
    Permission.PROPOSAL_READ,

    // Library (read-only)
    Permission.LIBRARY_READ,

    // Documents (read-only)
    Permission.DOCUMENT_READ,

    // Users (read-only)
    Permission.USER_READ,

    // Organization (read-only)
    Permission.ORG_READ,

    // Settings (read-only)
    Permission.SETTINGS_READ,
  ],
};

/**
 * Check if a role has a specific permission
 *
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns True if role has permission
 *
 * @example
 * ```typescript
 * hasPermission(UserRole.ADMIN, Permission.USER_CREATE) // true
 * hasPermission(UserRole.VIEWER, Permission.USER_CREATE) // false
 * ```
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions
 *
 * @param role - User role to check
 * @param permissions - Permissions to verify
 * @returns True if role has all permissions
 *
 * @example
 * ```typescript
 * hasAllPermissions(UserRole.ADMIN, [Permission.USER_CREATE, Permission.USER_DELETE]) // true
 * hasAllPermissions(UserRole.MEMBER, [Permission.USER_CREATE, Permission.USER_DELETE]) // false
 * ```
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = RolePermissions[role] ?? [];
  return permissions.every((p) => rolePermissions.includes(p));
}

/**
 * Check if a role has ANY of the specified permissions
 *
 * @param role - User role to check
 * @param permissions - Permissions to verify
 * @returns True if role has at least one permission
 *
 * @example
 * ```typescript
 * hasAnyPermission(UserRole.VIEWER, [Permission.PROPOSAL_CREATE, Permission.PROPOSAL_READ]) // true (has read)
 * hasAnyPermission(UserRole.VIEWER, [Permission.USER_CREATE, Permission.USER_DELETE]) // false
 * ```
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = RolePermissions[role] ?? [];
  return permissions.some((p) => rolePermissions.includes(p));
}
