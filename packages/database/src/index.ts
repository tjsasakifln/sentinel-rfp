/**
 * @sentinel/database
 * Database layer for Sentinel RFP using Prisma ORM
 */

export { PrismaClient, Prisma } from '@prisma/client';
export type { SystemConfig } from '@prisma/client';

// Re-export common types for convenience
export * from './types';
