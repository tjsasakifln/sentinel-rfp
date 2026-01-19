/**
 * Any Permissions Guard
 *
 * Enforces permission-based access control with OR logic.
 * User needs at least ONE of the specified permissions.
 *
 * @module AnyPermissionsGuard
 */

import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { Permission } from './permissions.enum';
import { hasAnyPermission } from './role-permissions.map';

export const ANY_PERMISSIONS_KEY = 'any_permissions';

/**
 * RequireAnyPermission decorator
 *
 * Marks route with permissions where user needs at least ONE.
 * Useful for routes accessible by multiple roles with different permissions.
 *
 * @param permissions - Permissions (OR logic - at least one required)
 *
 * @example
 * ```typescript
 * // Allow if user can either create OR update proposals
 * @RequireAnyPermission(Permission.PROPOSAL_CREATE, Permission.PROPOSAL_UPDATE)
 * @Post('/proposals/draft')
 * saveDraft() {}
 * ```
 */
export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);

/**
 * AnyPermissionsGuard
 *
 * Validates that user's role has AT LEAST ONE of the required permissions.
 * Uses RolePermissions mapping with OR logic.
 *
 * **When to use:**
 * - Use @RequireAnyPermission when multiple roles can access different features
 * - Use @Permissions when ALL permissions are required (stricter)
 *
 * @example
 * ```typescript
 * @Controller('dashboard')
 * @UseGuards(JwtAuthGuard, TenantGuard, AnyPermissionsGuard)
 * export class DashboardController {
 *   // Accessible by ADMIN (has USER_READ) or MEMBER (has PROPOSAL_READ)
 *   @RequireAnyPermission(Permission.USER_READ, Permission.PROPOSAL_READ)
 *   @Get()
 *   getDashboard() {}
 * }
 * ```
 */
@Injectable()
export class AnyPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required = allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user || !user.role) {
      return false; // No user or role = deny access
    }

    const userRole = user.role as UserRole;

    // Check if user's role has AT LEAST ONE required permission
    return hasAnyPermission(userRole, requiredPermissions);
  }
}
