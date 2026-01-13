/**
 * Auth Response DTO - Authentication response with tokens and user info
 *
 * Returned by register, login, and refresh endpoints.
 * Contains JWT tokens and sanitized user data (no sensitive fields).
 *
 * @module AuthResponseDto
 */

export interface AuthResponseDto {
  /**
   * JWT Access Token - Short-lived (15 minutes)
   * Used in Authorization header: Bearer <accessToken>
   */
  accessToken: string;

  /**
   * JWT Refresh Token - Long-lived (7 days)
   * Used to obtain new access tokens
   * Stored securely in httpOnly cookie (recommended) or client storage
   */
  refreshToken: string;

  /**
   * Sanitized user data (no sensitive fields like passwordHash)
   */
  user: {
    /**
     * User UUID
     */
    id: string;

    /**
     * User email
     */
    email: string;

    /**
     * User full name (firstName + lastName)
     */
    name: string;

    /**
     * User role within organization
     */
    role: string;

    /**
     * Organization UUID
     */
    organizationId: string;

    /**
     * Organization name
     */
    organizationName: string;
  };
}
