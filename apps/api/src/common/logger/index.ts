/**
 * Logger Module - Structured Logging with Pino
 *
 * Re-exports:
 * - LoggerModule: The main module to import in app.module.ts
 * - Logger: Injectable logger service to use in services/controllers
 *
 * Usage:
 * ```typescript
 * // In app.module.ts
 * import { LoggerModule } from './common/logger';
 *
 * // In services/controllers
 * import { Logger } from 'nestjs-pino';
 * ```
 */

export { LoggerModule } from './logger.module';
export { Logger } from 'nestjs-pino';
