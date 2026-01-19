/**
 * RBAC Module Exports
 *
 * Centralized export for Role-Based Access Control (RBAC) system.
 *
 * **What's included:**
 * - Roles (UserRole enum from Prisma)
 * - Permissions (granular resource:action permissions)
 * - Guards (RolesGuard, PermissionsGuard, AnyPermissionsGuard)
 * - Decorators (@Roles, @Permissions, @RequireAnyPermission)
 * - Utilities (hasPermission, hasAllPermissions, hasAnyPermission)
 *
 * @module RBAC
 */

// Re-export UserRole from Prisma
export { UserRole } from '@prisma/client';

// Permissions
export { Permission, PermissionDescriptions } from './permissions.enum';

// Role-Permission Mapping
export {
  RolePermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from './role-permissions.map';

// Guards and Decorators
export { RolesGuard, Roles, ROLES_KEY } from '../auth/guards/roles.guard';
export { PermissionsGuard, Permissions, PERMISSIONS_KEY } from './permissions.guard';
export {
  AnyPermissionsGuard,
  RequireAnyPermission,
  ANY_PERMISSIONS_KEY,
} from './any-permissions.guard';
