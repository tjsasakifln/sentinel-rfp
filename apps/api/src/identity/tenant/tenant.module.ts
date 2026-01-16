/**
 * Tenant Module
 *
 * Provides multi-tenancy infrastructure for the application.
 * Exports TenantContext (request-scoped) and TenantGuard.
 *
 * @module TenantModule
 */

import { Module } from '@nestjs/common';

import { TenantContext } from './tenant.context';
import { TenantGuard } from './tenant.guard';

/**
 * TenantModule
 *
 * Registers tenant-related providers and exports them for use in other modules.
 *
 * Providers:
 * - TenantContext: Request-scoped service for storing current organization ID
 * - TenantGuard: Guard for extracting organizationId from JWT
 *
 * ⚠️ Prisma Middleware Implementation Pending (Issue #169)
 * See TENANT_MIDDLEWARE_IMPLEMENTATION.md for migration guide to Prisma 6.x Client Extensions
 *
 * @example
 * ```typescript
 * // In your feature module
 * @Module({
 *   imports: [TenantModule],
 *   controllers: [MyController],
 *   providers: [MyService],
 * })
 * export class MyModule {}
 *
 * // In your controller
 * @UseGuards(JwtAuthGuard, TenantGuard)
 * @Controller('my-resource')
 * export class MyController {
 *   constructor(private readonly tenantContext: TenantContext) {}
 * }
 * ```
 */
@Module({
  providers: [TenantContext, TenantGuard],
  exports: [TenantContext, TenantGuard],
})
export class TenantModule {}
