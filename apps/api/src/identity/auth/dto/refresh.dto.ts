/**
 * Refresh DTO - Token refresh request
 *
 * Used to request new access/refresh token pair.
 * Implements refresh token rotation for security.
 *
 * Security Notes:
 * - Refresh token rotation prevents replay attacks
 * - Old refresh tokens are blacklisted after use
 * - If blacklisted token is reused, all user tokens are invalidated
 *
 * @module RefreshDto
 */

import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  /**
   * Refresh token from previous authentication
   * Must be a valid JWT with 7-day expiration
   */
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}
