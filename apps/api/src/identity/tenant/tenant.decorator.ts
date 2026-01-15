/**
 * Tenant Decorators
 *
 * Parameter decorators for extracting tenant (organization) information in controllers.
 *
 * @module TenantDecorators
 */

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

import { SKIP_TENANT_KEY } from './tenant.guard';

/**
 * @CurrentTenant() Decorator
 *
 * Extracts organization ID from authenticated user (JWT payload).
 * Convenience decorator for controllers.
 *
 * @returns Organization UUID
 *
 * @example
 * ```typescript
 * @Get()
 * async findAll(@CurrentTenant() organizationId: string) {
 *   // organizationId is extracted from JWT
 *   return this.service.findByOrganization(organizationId);
 * }
 * ```
 *
 * Note: Requires JwtAuthGuard to be applied to the route.
 * Throws UnauthorizedException if user not authenticated or organizationId missing.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.organizationId) {
      throw new Error('Organization ID not found in request. Ensure JwtAuthGuard is applied.');
    }

    return user.organizationId;
  },
);

/**
 * @SkipTenant() Decorator
 *
 * Marks a route to skip TenantGuard validation.
 * Useful for public routes or super-admin endpoints that operate across all tenants.
 *
 * @example
 * ```typescript
 * @Get('public-stats')
 * @SkipTenant()
 * async getPublicStats() {
 *   // This route will not require tenant context
 *   return this.service.getGlobalStats();
 * }
 * ```
 *
 * Security Note: Use sparingly. Most routes should be tenant-scoped.
 */
export const SkipTenant = () => SetMetadata(SKIP_TENANT_KEY, true);
