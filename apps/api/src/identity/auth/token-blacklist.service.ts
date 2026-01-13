/**
 * Token Blacklist Service
 *
 * Manages blacklisting of JWT tokens for logout and refresh token rotation.
 * Shared between AuthService and JwtStrategy to prevent circular dependencies.
 *
 * Implementation:
 * - Currently uses in-memory Map (single instance)
 * - TODO: Migrate to Redis for distributed blacklist (#120)
 * - Automatic cleanup of expired tokens every hour
 *
 * @module TokenBlacklistService
 */

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);

  /**
   * In-memory blacklist for tokens
   * Map<token, expirationTimestamp>
   */
  private readonly blacklist = new Map<string, number>();

  constructor() {
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupBlacklist(), 60 * 60 * 1000);
  }

  /**
   * Add token to blacklist with expiration time
   *
   * @param token - JWT token to blacklist
   * @param expirationTime - Unix timestamp in milliseconds when token expires
   */
  addToBlacklist(token: string, expirationTime: number): void {
    this.blacklist.set(token, expirationTime);
  }

  /**
   * Check if token is blacklisted
   *
   * @param token - JWT token to check
   * @returns true if token is blacklisted, false otherwise
   */
  isBlacklisted(token: string): boolean {
    if (!this.blacklist.has(token)) {
      return false;
    }

    // Check if token is still valid (not expired)
    const expirationTime = this.blacklist.get(token)!;
    const now = Date.now();

    if (expirationTime < now) {
      // Token expired, remove from blacklist
      this.blacklist.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Get blacklist size (for monitoring)
   *
   * @returns number of tokens in blacklist
   */
  getBlacklistSize(): number {
    return this.blacklist.size;
  }

  /**
   * Remove expired tokens from blacklist
   * Called automatically every hour to prevent memory leaks
   */
  private cleanupBlacklist(): void {
    const now = Date.now();
    let removed = 0;

    for (const [token, expiration] of this.blacklist.entries()) {
      if (expiration < now) {
        this.blacklist.delete(token);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.log(
        `Cleaned up ${removed} expired tokens from blacklist. Current size: ${this.blacklist.size}`,
      );
    }
  }
}
