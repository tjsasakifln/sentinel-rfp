/**
 * Permissions Guard
 *
 * Enforces permission-based access control using @Permissions decorator.
 * More granular than RolesGuard - checks specific resource:action permissions.
 *
 * @module PermissionsGuard
 */

import { Injectable, CanActivate, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

import { Permission } from './permissions.enum';
import { hasAllPermissions } from './role-permissions.map';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions decorator
 *
 * Marks route with required permissions.
 * User must have ALL specified permissions to access the route.
 *
 * @param permissions - Required permissions (AND logic)
 *
 * @example
 * ```typescript
 * @Permissions(Permission.PROPOSAL_CREATE, Permission.LIBRARY_READ)
 * @Post('/proposals')
 * createProposal() {}
 * ```
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * PermissionsGuard
 *
 * Validates that user's role has all required permissions.
 * Uses RolePermissions mapping to check granular permissions.
 *
 * **Order of guards:**
 * 1. JwtAuthGuard (authentication)
 * 2. TenantGuard (multi-tenancy)
 * 3. RolesGuard (role-based) OR PermissionsGuard (permission-based)
 *
 * **Usage:**
 * - Use @Permissions for granular control (preferred)
 * - Use @Roles for simple role checks
 *
 * @example
 * ```typescript
 * @Controller('proposals')
 * @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
 * export class ProposalController {
 *   @Permissions(Permission.PROPOSAL_CREATE)
 *   @Post()
 *   create() {}
 * }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required = allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user || !user.role) {
      return false; // No user or role = deny access
    }

    const userRole = user.role as UserRole;

    // Check if user's role has ALL required permissions
    return hasAllPermissions(userRole, requiredPermissions);
  }
}
