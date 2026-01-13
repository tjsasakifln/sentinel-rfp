/**
 * Login DTO - User login request
 *
 * Validates email format and password presence.
 * Used by POST /v1/auth/login endpoint.
 *
 * Security Notes:
 * - Generic error messages prevent user enumeration
 * - Rate limiting prevents brute force attacks
 * - Password is never logged or exposed
 *
 * @module LoginDto
 */

import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /**
   * User email - Used to identify the user
   * Format validation via IsEmail
   */
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;

  /**
   * Plain text password - Will be verified against stored hash
   *
   * Note: Password strength validation is NOT enforced at login
   * (only at registration) to allow users with legacy passwords to login.
   */
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
