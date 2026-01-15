/**
 * Tenant Context Service
 *
 * Request-scoped service that stores the current tenant (organization) context.
 * Automatically populated by TenantGuard from JWT payload.
 *
 * Scope: REQUEST - new instance per HTTP request
 *
 * @module TenantContext
 */

import { Injectable, Scope } from '@nestjs/common';

/**
 * TenantContext
 *
 * Stores organization ID for the current request.
 * Used by Prisma middleware to automatically filter queries by tenant.
 *
 * Security:
 * - Request-scoped prevents context leakage between requests
 * - Throws error if accessed before initialization
 * - Immutable after first assignment (single-write)
 *
 * @example
 * ```typescript
 * // In a controller or service
 * constructor(private readonly tenantContext: TenantContext) {}
 *
 * async someMethod() {
 *   const orgId = this.tenantContext.organizationId; // Gets current tenant
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private _organizationId: string | null = null;
  private _initialized = false;

  /**
   * Get current organization ID
   *
   * @throws Error if context not initialized (no JWT / TenantGuard not run)
   * @returns Organization UUID
   */
  get organizationId(): string {
    if (!this._initialized || !this._organizationId) {
      throw new Error(
        'Tenant context not initialized. Ensure TenantGuard is applied to the route.',
      );
    }
    return this._organizationId;
  }

  /**
   * Set organization ID
   *
   * Can only be set once per request (immutable after first set).
   * Should only be called by TenantGuard.
   *
   * @param orgId - Organization UUID from JWT
   * @throws Error if already initialized (prevents context hijacking)
   */
  set organizationId(orgId: string) {
    if (this._initialized) {
      throw new Error(
        'Tenant context already initialized. Cannot change organization mid-request.',
      );
    }

    if (!orgId || typeof orgId !== 'string') {
      throw new Error('Invalid organization ID');
    }

    this._organizationId = orgId;
    this._initialized = true;
  }

  /**
   * Check if context is initialized
   *
   * Useful for conditional logic (e.g., skip tenant filtering for public routes)
   *
   * @returns true if organizationId has been set
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Reset context (for testing only)
   *
   * @internal
   */
  reset(): void {
    this._organizationId = null;
    this._initialized = false;
  }
}
