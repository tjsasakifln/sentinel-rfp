/**
 * Roles Guard
 *
 * Enforces role-based access control (RBAC) using @Roles decorator.
 * Validates JWT payload role against required roles.
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
 *
 * @example
 * ```typescript
 * @Roles('OWNER', 'ADMIN')
 * @Get('/admin-only')
 * adminRoute() {}
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
