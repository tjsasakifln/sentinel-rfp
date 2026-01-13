/**
 * Auth Module Exports
 *
 * Barrel export for authentication module.
 * Provides convenient imports from a single entry point.
 *
 * @example
 * import { AuthModule, JwtAuthGuard, CurrentUser } from '@/identity/auth';
 */

export * from './auth.module';
export * from './decorators/current-user.decorator';
export * from './decorators/public.decorator';
export * from './guards/jwt-auth.guard';
export * from './strategies/jwt.strategy';
export * from './utils/password.util';
