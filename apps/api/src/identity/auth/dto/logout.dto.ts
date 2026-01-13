/**
 * Logout DTO - Token invalidation request
 *
 * Used to invalidate both access and refresh tokens.
 * Implements token blacklisting for secure logout.
 *
 * Security Notes:
 * - Both access and refresh tokens are blacklisted
 * - Tokens remain blacklisted until their natural expiration
 * - TTL is calculated based on remaining time until expiration
 * - Prevents token reuse after logout
 *
 * @module LogoutDto
 */

import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  /**
   * Refresh token to invalidate
   * Must be a valid JWT
   */
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}
