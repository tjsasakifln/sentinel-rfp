/**
 * Register DTO - User registration request
 *
 * Validates email uniqueness, password strength, and organization context.
 * Supports two registration flows:
 * 1. Create new organization (first user becomes OWNER)
 * 2. Join existing organization (requires valid organizationId)
 *
 * @module RegisterDto
 */

import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  /**
   * User email - Must be unique within organization
   * Format validation via IsEmail
   */
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email!: string;

  /**
   * Plain text password - Will be hashed with Argon2id
   *
   * Requirements:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 symbol
   */
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and symbol',
    },
  )
  password!: string;

  /**
   * User's first name
   */
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(1, { message: 'First name must not be empty' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName!: string;

  /**
   * User's last name
   */
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(1, { message: 'Last name must not be empty' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName!: string;

  /**
   * Organization ID - Join existing organization
   *
   * Optional: If not provided, a new organization will be created
   * and the user will become the OWNER.
   *
   * If provided, organization must exist and be ACTIVE.
   */
  @IsOptional()
  @IsUUID(4, { message: 'Invalid organization ID format' })
  organizationId?: string;

  /**
   * Organization name - Used when creating new organization
   *
   * Required if organizationId is not provided.
   * Ignored if organizationId is provided (joining existing org).
   */
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Organization name must not be empty' })
  @MaxLength(200, { message: 'Organization name must not exceed 200 characters' })
  organizationName?: string;
}
