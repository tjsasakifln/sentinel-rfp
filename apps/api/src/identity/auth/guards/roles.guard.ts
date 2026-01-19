/**
 * Roles Guard
 *
 * Enforces role-based access control (RBAC) using @Roles decorator.
 * Validates JWT payload role against required roles.
 *
 * **Role Hierarchy:**
 * OWNER > ADMIN > MEMBER > SME > VIEWER
 *
 * **When to use:**
 * - Use @Roles for simple role checks (e.g., admin-only routes)
 * - Use @Permissions (PermissionsGuard) for granular resource:action checks
 *
 * **Order of guards:**
 * 1. JwtAuthGuard (authentication)
 * 2. TenantGuard (multi-tenancy)
 * 3. RolesGuard (role-based) OR PermissionsGuard (permission-based)
 *
 * @module RolesGuard
 */

import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator
 *
 * Marks route with required roles.
 * User must have ONE OF the specified roles to access the route.
 *
 * @param roles - Required roles (OR logic)
 *
 * @example
 * ```typescript
 * // Allow OWNER or ADMIN
 * @Roles(UserRole.OWNER, UserRole.ADMIN)
 * @Get('/admin-only')
 * adminRoute() {}
 *
 * // Allow all roles except VIEWER
 * @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER, UserRole.SME)
 * @Post('/proposals')
 * createProposal() {}
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required = allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user || !user.role) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
