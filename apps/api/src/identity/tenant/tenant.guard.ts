/**
 * Tenant Guard
 *
 * NestJS Guard that extracts organizationId from JWT and injects into TenantContext.
 * Should be applied to routes that require multi-tenant isolation.
 *
 * Order of Guards:
 * 1. JwtAuthGuard - validates JWT and populates request.user
 * 2. TenantGuard - extracts organizationId from request.user
 * 3. RolesGuard - checks user role (if applicable)
 *
 * @module TenantGuard
 */

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { TenantContext } from './tenant.context';

/**
 * Metadata key for skipping tenant guard
 *
 * Used with @Public() decorator or custom @SkipTenant() decorator
 */
export const SKIP_TENANT_KEY = 'skipTenant';

/**
 * TenantGuard
 *
 * Extracts organizationId from authenticated user (JWT payload)
 * and injects it into TenantContext.
 *
 * Security:
 * - Requires JwtAuthGuard to run first (expects request.user)
 * - Throws UnauthorizedException if organizationId missing
 * - Can be skipped for public routes using metadata
 *
 * @example
 * ```typescript
 * // Apply to controller
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * @Controller('proposals')
 * export class ProposalController {}
 *
 * // Apply globally in app.module.ts
 * app.useGlobalGuards(new TenantGuard(app.get(TenantContext)));
 * ```
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly tenantContext: TenantContext,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Validate and inject tenant context
   *
   * @param context - Execution context
   * @returns true if tenant context successfully injected
   * @throws UnauthorizedException if organizationId missing from JWT
   */
  canActivate(context: ExecutionContext): boolean {
    // Check if tenant guard should be skipped (public routes, etc.)
    const skipTenant = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Populated by JwtAuthGuard

    // JwtAuthGuard should run before TenantGuard
    if (!user) {
      throw new UnauthorizedException(
        'User not authenticated. Ensure JwtAuthGuard runs before TenantGuard.',
      );
    }

    // Validate organizationId exists in JWT payload
    if (!user.organizationId) {
      throw new UnauthorizedException(
        'Organization ID not found in token. Token may be invalid or outdated.',
      );
    }

    // Inject organizationId into request-scoped TenantContext
    try {
      this.tenantContext.organizationId = user.organizationId;
    } catch (error) {
      // TenantContext throws if already initialized (shouldn't happen in normal flow)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new UnauthorizedException('Failed to initialize tenant context: ' + errorMessage);
    }

    return true;
  }
}
